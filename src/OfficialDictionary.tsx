import { useEffect, useState } from "react";
import ReadAlong from "./ReadAlong";

export interface DictionaryData {
  version: string;
  columns: string[];
  entries: string[][];
}
export function lookupEntries(data: DictionaryData, phrase: string) {
  return data.entries.filter((entry) => entry[0] === phrase);
}
export function officialLinks(phrase: string) {
  return {
    moe: `https://dict.concised.moe.edu.tw/search.jsp?md=1&word=${encodeURIComponent(phrase)}`,
    naer: `https://coct.naer.edu.tw/word.jsp?WORD=${encodeURIComponent(phrase)}`,
  };
}
let pending: Promise<DictionaryData> | undefined;
export function loadDictionary() {
  return (pending ??= fetch(
    `${import.meta.env.BASE_URL}dictionaries/moe-concised.json`,
  )
    .then((response) => {
      if (!response.ok) throw new Error("無法載入詞庫");
      return response.json() as Promise<DictionaryData>;
    })
    .catch((error) => {
      pending = undefined;
      throw error;
    }));
}

export default function OfficialDictionary({
  phrase,
  speak,
}: {
  phrase: string;
  speak: (text: string) => void;
}) {
  const [data, setData] = useState<DictionaryData | null>(null);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let active = true;
    setFailed(false);
    loadDictionary()
      .then((value) => {
        if (active) setData(value);
      })
      .catch(() => {
        if (active) setFailed(true);
      });
    return () => {
      active = false;
    };
  }, [attempt]);
  const entries = data ? lookupEntries(data, phrase) : [];
  const links = officialLinks(phrase);
  return (
    <section
      className="official-dictionary"
      aria-label={`「${phrase}」官方辭典`}
    >
      <h3>教育部詞語資料 · {phrase}</h3>
      <div aria-live="polite">
        {!data && !failed && <p>正在載入教育部詞庫…</p>}
        {failed && (
          <p>
            詞庫暫時無法載入，可以開啟官方網站查詢。
            <button onClick={() => setAttempt((value) => value + 1)}>
              重新載入詞庫
            </button>
          </p>
        )}
        {data && !entries.length && (
          <p>此版本未找到完全相同的詞目。可到官方網站搜尋其他寫法或相關詞。</p>
        )}
        {entries.map((entry, index) => (
          <article key={entry[1] + index}>
            <p className="official-reading">
              {entry[6]}
              {entry[8] && ` ／ ${entry[8]}`}
            </p>
            <p className="official-definition">
              <ReadAlong text={entry[13]} />
            </p>
            {entry[14] && <p>{entry[14]}</p>}
            <button
              className="text-button"
              onClick={() => speak(`${phrase}。${entry[13]}`)}
            >
              朗讀官方詞義{entries.length > 1 ? ` ${index + 1}` : ""}
            </button>
          </article>
        ))}
      </div>
      <div className="official-links">
        <a href={links.moe} target="_blank" rel="noopener noreferrer">
          教育部查「{phrase}」 ↗
        </a>
        <a href={links.naer} target="_blank" rel="noopener noreferrer">
          國教院詞語分級查詢 ↗
        </a>
      </div>
      <small>
        中華民國教育部（Ministry of Education,
        R.O.C.）。《國語辭典簡編本》（版本編號：2014_20260929）。
        <a
          href="https://dict.concised.moe.edu.tw/"
          target="_blank"
          rel="noopener noreferrer"
        >
          原典
        </a>{" "}
        ·{" "}
        <a
          href={`${import.meta.env.BASE_URL}dictionaries/moe-usage.pdf`}
          target="_blank"
          rel="noopener noreferrer"
        >
          公眾授權使用說明（CC BY-ND 3.0 TW）
        </a>
        。以上為詞語整體釋義；本專案的逐字白話解說另行編寫。國教院資料於官方網站查詢。
      </small>
    </section>
  );
}
