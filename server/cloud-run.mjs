import { GoogleAuth } from "google-auth-library";
import { initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { createSchoolIamHandler } from './schooliam-handler.mjs';
import { createStructureServer } from "./structure-api.mjs";
import {createWritingHandler,createWritingCloudStore} from './writing-api.mjs';

const project = "voltaic-circuit-511310-a3";
const secret = `projects/${project}/secrets/zh-tw-ai-settings`;
const auth = new GoogleAuth({
  scopes: ["https://www.googleapis.com/auth/cloud-platform"],
});
const empty = () => ({ version: 2, selected: "deepseek", profiles: {} });
const configStore = {
  async load() {
    try {
      const response = await auth.request({
        url: `https://secretmanager.googleapis.com/v1/${secret}/versions/latest:access`,
        timeout: 15000,
      });
      const value = JSON.parse(
        Buffer.from(response.data.payload.data, "base64").toString("utf8"),
      );
      if (
        value.version !== 2 ||
        typeof value.profiles !== "object" ||
        !value.profiles
      )
        throw new Error("設定格式無效");
      return value;
    } catch (error) {
      if (error.response?.status === 404) return empty();
      throw new Error("雲端設定讀取失敗");
    }
  },
  async save(value) {
    try {
      await auth.request({
        url: `https://secretmanager.googleapis.com/v1/${secret}:addVersion`,
        method: "POST",
        timeout: 15000,
        data: {
          payload: {
            data: Buffer.from(JSON.stringify(value)).toString("base64"),
          },
        },
      });
    } catch {
      throw new Error("雲端設定儲存失敗");
    }
  },
};
const site = process.env.HOSTING_SITE;
if (!site || !/^[a-z0-9-]+$/.test(site)) throw new Error("HOSTING_SITE 未設定");
const origins = [...new Set([site, 'zh-tw', 'voltaic-circuit-511310-a3-zh-tw'])].flatMap(id=>[`https://${id}.web.app`,`https://${id}.firebaseapp.com`]);
const server = createStructureServer({
  quizStore:createWritingCloudStore(auth,`${project}-zh-tw-writing`),
  writingHandler:createWritingHandler({store:createWritingCloudStore(auth,`${project}-zh-tw-writing`),origins}),
  cloud: true,
  configStore,
  origins,
});
const iamApp = initializeApp({ projectId: project }, 'schooliam-bridge');
const iamHandler = createSchoolIamHandler({ auth: getAuth(iamApp), db: getFirestore(iamApp) });
const originalHandlers = server.listeners('request');
server.removeAllListeners('request');
server.on('request', (req, res) => {
  const path = req.url.split('?')[0];
  if (['/auth/schooliam/login', '/auth/schooliam/exchange'].includes(path)) {
    void iamHandler(req, res);
  } else {
    for (const handler of originalHandlers) handler.call(server, req, res);
  }
});
server.listen(Number(process.env.PORT || 8080), "0.0.0.0", () =>
  console.log("zh-tw cloud API ready"),
);
