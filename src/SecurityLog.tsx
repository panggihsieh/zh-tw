import {useEffect,useState} from "react";
import {cloudServices} from "./cloudSync";

type Entry = {at:number;ip:string|null;status:number;kind:string;route:string;blocked:boolean};

async function request(path:string, entry?:Entry) {
  const user=cloudServices().auth.currentUser;
  if (!user) throw Error("請先登入管理者帳號。");
  const response=await fetch("/api/structure/security"+path,{
    method:entry?"POST":"GET",
    headers:{Authorization:"Bearer "+await user.getIdToken(),
      ...(entry?{"X-Notebook-Request":"structure-settings","X-Security-IP":entry.ip!,
        "X-Security-Action":entry.blocked?"unblock":"block"}:{})},
  });
  const result=await response.json();
  if (!response.ok) throw Error(result.error);
  return result;
}

export default function SecurityLog() {
  const [items,setItems]=useState<Entry[]>([]);
  const [error,setError]=useState("");
  const [busy,setBusy]=useState(false);
  async function refresh(entry?:Entry) {
    setBusy(true);
    setError("");
    try {
      if (entry) await request("/block",entry);
      setItems((await request("")).items);
    } catch (reason) {
      setError((reason as Error).message);
    } finally {
      setBusy(false);
    }
  }
  useEffect(()=>{void refresh();},[]);
  return <section>
    <h2>安全事件紀錄</h2>
    <p>顯示最近 50 筆 API 拒絕事件。封鎖會限制該 IP 使用本站 API 15 分鐘。</p>
    <button disabled={busy} className="secondary" onClick={()=>void refresh()}>重新整理</button>
    {error && <p role="alert">{error}</p>}
    {!error && !busy && !items.length && <p>目前沒有安全事件。</p>}
    <ul>{items.map((entry,index)=><li key={index}>
      {new Date(entry.at).toLocaleString("zh-TW")} · {entry.kind} ({entry.status}) · {entry.route} · {entry.ip ?? "來源不明"}{" "}
      {entry.ip && <button className="secondary" disabled={busy}
        onClick={()=>void refresh(entry)}>{entry.blocked?"解除封鎖":"封鎖 15 分鐘"}</button>}
    </li>)}</ul>
  </section>;
}
