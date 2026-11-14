// Uses Application Default Credentials; never prints credentials or uploads .env/.local.
import { GoogleAuth } from "google-auth-library";
import { mkdir, copyFile, readFile, writeFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { resolve } from "node:path";
const project = "voltaic-circuit-511310-a3";
const region = "asia-east1";
const site = `${project}-zh-tw`;
const service = "zh-tw-structure-api";
const auth = new GoogleAuth({
  scopes: ["https://www.googleapis.com/auth/cloud-platform"],
});
async function api(url, method = "GET", data) {
  try {
    return (await auth.request({ url, method, data, timeout: 60000 })).data;
  } catch (e) {
    const error = new Error(
      `Cloud API ${e.response?.status || "network"}: ${e.response?.data?.error?.message || "request failed"}`,
    );
    error.status = e.response?.status;
    throw error;
  }
}
async function ensure(url, method, data) {
  try {
    return await api(url, method, data);
  } catch (e) {
    if (e.status !== 409) throw e;
  }
}
const meta = await api(
  `https://cloudresourcemanager.googleapis.com/v1/projects/${project}`,
);
for (const name of [
  "run",
  "cloudbuild",
  "artifactregistry",
  "secretmanager",
  "iam",
  "storage",
]) {
  await api(
    `https://serviceusage.googleapis.com/v1/projects/${meta.projectNumber}/services/${name}.googleapis.com:enable`,
    "POST",
    {},
  );
}
console.log("Required APIs enabled");
const saId = "zh-tw-runtime";
const email = `${saId}@${project}.iam.gserviceaccount.com`;
await ensure(
  `https://iam.googleapis.com/v1/projects/${project}/serviceAccounts`,
  "POST",
  {
    accountId: saId,
    serviceAccount: { displayName: "zh-tw isolated runtime" },
  },
);
const secretUrl = `https://secretmanager.googleapis.com/v1/projects/${project}/secrets`;
await ensure(`${secretUrl}?secretId=zh-tw-ai-settings`, "POST", {
  replication: { automatic: {} },
  labels: { app: "zh-tw" },
});
const policy = await api(`${secretUrl}/zh-tw-ai-settings:getIamPolicy`);
policy.bindings ||= [];
for (const role of [
  "roles/secretmanager.secretAccessor",
  "roles/secretmanager.secretVersionAdder",
]) {
  let binding = policy.bindings.find((b) => b.role === role);
  if (!binding) policy.bindings.push((binding = { role, members: [] }));
  if (!binding.members.includes(`serviceAccount:${email}`))
    binding.members.push(`serviceAccount:${email}`);
}
await api(`${secretUrl}/zh-tw-ai-settings:setIamPolicy`, "POST", { policy });
await ensure(
  `https://artifactregistry.googleapis.com/v1/projects/${project}/locations/${region}/repositories?repositoryId=zh-tw`,
  "POST",
  { format: "DOCKER", description: "zh-tw API images" },
);
const bucket = `${project}-zh-tw-build`;
await ensure(
  `https://storage.googleapis.com/storage/v1/b?project=${project}`,
  "POST",
  {
    name: bucket,
    location: "ASIA-EAST1",
    iamConfiguration: { uniformBucketLevelAccess: { enabled: true } },
    lifecycle: {
      rule: [{ action: { type: "Delete" }, condition: { age: 7 } }],
    },
  },
);
const stage = resolve(".local/cloud-build");
// Dedicated private student-work bucket; no public ACL or shared Firestore rule changes.
const writingBucket = `${project}-zh-tw-writing`;
await ensure(`https://storage.googleapis.com/storage/v1/b?project=${project}`, 'POST', {
  name: writingBucket, location:'ASIA-EAST1',
  iamConfiguration:{uniformBucketLevelAccess:{enabled:true},publicAccessPrevention:'enforced'},
  labels:{app:'zh-tw',purpose:'student-writing'},
});
const writingPolicyUrl=`https://storage.googleapis.com/storage/v1/b/${writingBucket}/iam`;
const writingPolicy=await api(writingPolicyUrl);
writingPolicy.bindings ||= [];
let writingBinding=writingPolicy.bindings.find(b=>b.role==='roles/storage.objectAdmin'&&!b.condition);
if(!writingBinding) writingPolicy.bindings.push(writingBinding={role:'roles/storage.objectAdmin',members:[]});
if(!writingBinding.members.includes(`serviceAccount:${email}`)) writingBinding.members.push(`serviceAccount:${email}`);
await api(writingPolicyUrl,'PUT',writingPolicy);
await mkdir(resolve(stage, "server"), { recursive: true });
for (const file of [
  "structure-api.mjs",
  "providers.mjs",
  "secret-store.mjs",
  "admin-auth.mjs",
  "cloud-run.mjs",
  "writing-api.mjs",
  "quiz-api.mjs",
  "sentence-api.mjs",
  "competition-api.mjs",
  "sentence-bank.json",
  "publisher-sync.mjs",
])
  await copyFile(`server/${file}`, resolve(stage, "server", file));
for (const file of ["package.json", "package-lock.json", "Dockerfile"])
  await copyFile(`deploy/cloud/${file}`, resolve(stage, file));
const archive = resolve(".local/zh-tw-cloud-source.tgz");
execFileSync("tar", [
  "-czf",
  archive,
  "-C",
  stage,
  "package.json",
  "package-lock.json",
  "Dockerfile",
  "server",
]);
const tag =
  execFileSync("git", ["rev-parse", "--short", "HEAD"], {
    encoding: "utf8",
  }).trim() +
  "-" +
  Date.now();
const object = `source/${tag}.tgz`;
await auth.request({
  url: `https://storage.googleapis.com/upload/storage/v1/b/${bucket}/o?uploadType=media&name=${encodeURIComponent(object)}`,
  method: "POST",
  data: await readFile(archive),
  headers: { "Content-Type": "application/gzip" },
  timeout: 60000,
});
const image = `${region}-docker.pkg.dev/${project}/zh-tw/structure-api:${tag}`;
const buildsUrl = `https://cloudbuild.googleapis.com/v1/projects/${project}/locations/global/builds`;
const operation = await api(buildsUrl, "POST", {
  serviceAccount: `projects/${project}/serviceAccounts/${meta.projectNumber}-compute@developer.gserviceaccount.com`,
  source: { storageSource: { bucket, object } },
  steps: [
    { name: "gcr.io/cloud-builders/docker", args: ["build", "-t", image, "."] },
  ],
  images: [image],
  timeout: "600s",
  options: { logging: "CLOUD_LOGGING_ONLY" },
});
const buildId = operation.metadata?.build?.id;
if (!buildId) throw new Error("Build ID missing");
console.log(`Cloud Build started: ${buildId}`);
await writeFile(
  ".local/cloud-deployment.json",
  JSON.stringify({ buildId, image, service, region, site }),
);
for (;;) {
  const build = await api(`${buildsUrl}/${buildId}`);
  console.log(`Build: ${build.status}`);
  if (build.status === "SUCCESS") break;
  if (
    ["FAILURE", "TIMEOUT", "CANCELLED", "INTERNAL_ERROR", "EXPIRED"].includes(
      build.status,
    )
  )
    throw new Error(
      `Build failed: ${build.status} ${build.failureInfo?.detail || ""}`,
    );
  await new Promise((r) => setTimeout(r, 15000));
}
const runUrl = `https://run.googleapis.com/v2/projects/${project}/locations/${region}/services`;
const spec = {
  template: {
    serviceAccount: email,
    maxInstanceRequestConcurrency: 8,
    scaling: { minInstanceCount: 0, maxInstanceCount: 1 },
    timeout: "150s",
    containers: [
      {
        image,
        ports: [{ containerPort: 8080 }],
        env: [{ name: "HOSTING_SITE", value: site }],
        resources: { limits: { cpu: "1", memory: "512Mi" }, cpuIdle: true },
      },
    ],
  },
  ingress: "INGRESS_TRAFFIC_ALL",
};
let deploy;
try {
  const existing = await api(`${runUrl}/${service}`);
  // Keep runtime settings, environment, secrets and volumes on the existing service.
  const template = { ...existing.template };
  delete template.revision;
  template.containers = existing.template.containers.map((container, index) =>
    index === 0 ? { ...container, image } : container,
  );
  deploy = await api(
    `${runUrl}/${service}?updateMask=template`,
    "PATCH",
    {
      name: `projects/${project}/locations/${region}/services/${service}`,
      template,
    },
  );
} catch (e) {
  if (e.status !== 404) throw e;
  deploy = await api(`${runUrl}?serviceId=${service}`, "POST", spec);
}
console.log("Cloud Run deploying");
while (!deploy.done) {
  await new Promise((r) => setTimeout(r, 5000));
  deploy = await api(`https://run.googleapis.com/v2/${deploy.name}`);
}
if (deploy.error)
  throw new Error(`Cloud Run deploy failed: ${deploy.error.message}`);
const runPolicy = await api(`${runUrl}/${service}:getIamPolicy`);
runPolicy.bindings ||= [];
let invoker = runPolicy.bindings.find((b) => b.role === "roles/run.invoker");
if (!invoker)
  runPolicy.bindings.push(
    (invoker = { role: "roles/run.invoker", members: [] }),
  );
if (!invoker.members.includes("allUsers")) invoker.members.push("allUsers");
await api(`${runUrl}/${service}:setIamPolicy`, "POST", { policy: runPolicy });
console.log(
  JSON.stringify({
    service,
    uri: deploy.response?.uri,
    authentication: "Firebase admin ID token required by application",
  }),
);
