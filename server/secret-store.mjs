import { spawn } from "node:child_process";
const script = `Add-Type -AssemblyName System.Security; $v=[Console]::In.ReadToEnd() | ConvertFrom-Json; $b=[Convert]::FromBase64String($v.data); if($v.mode -eq 'protect'){$r=[Security.Cryptography.ProtectedData]::Protect($b,$null,[Security.Cryptography.DataProtectionScope]::CurrentUser)}else{$r=[Security.Cryptography.ProtectedData]::Unprotect($b,$null,[Security.Cryptography.DataProtectionScope]::CurrentUser)}; [Console]::Out.Write([Convert]::ToBase64String($r))`;
function dpapi(mode, data) {
  if (process.platform !== "win32")
    throw new Error("本機加密需要 Windows DPAPI");
  return new Promise((resolve, reject) => {
    const child = spawn(
      "powershell.exe",
      ["-NoProfile", "-NonInteractive", "-Command", script],
      { windowsHide: true, stdio: ["pipe", "pipe", "pipe"] },
    );
    let output = "";
    child.stdout.on("data", (chunk) => {
      output += chunk;
    });
    child.stderr.resume();
    const timer = setTimeout(() => {
      child.kill();
      reject(new Error("Windows 加密服務逾時"));
    }, 15000);
    child.on("error", () => {
      clearTimeout(timer);
      reject(new Error("無法啟動 Windows 加密服務"));
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      code === 0 && output.trim()
        ? resolve(output.trim())
        : reject(new Error("Windows 帳號加解密失敗"));
    });
    child.stdin.end(JSON.stringify({ mode, data }));
  });
}
export async function protectSettings(value) {
  return {
    version: 3,
    protection: "windows-dpapi-current-user",
    payload: await dpapi(
      "protect",
      Buffer.from(JSON.stringify(value), "utf8").toString("base64"),
    ),
  };
}
export async function unprotectSettings(envelope) {
  if (envelope.protection !== "windows-dpapi-current-user")
    throw new Error("設定加密格式不支援");
  return JSON.parse(
    Buffer.from(await dpapi("unprotect", envelope.payload), "base64").toString(
      "utf8",
    ),
  );
}
