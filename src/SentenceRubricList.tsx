import { RUBRIC_ITEMS, type RubricItem } from '../server/sentence-rubric.mjs';

/** 顯示一字多詞造句的評分規則（老師開課確認、學生等候室共用）。 */
export default function SentenceRubricList({ rubric, title = '造句評分規則' }: { rubric: RubricItem[]; title?: string }) {
  return <section className="sentence-rubric-list" aria-label={title}>
    <h3>{title}</h3>
    <ul>{rubric.map(item => <li key={item.key}>
      <strong>{item.label}</strong><span>{item.points} 分</span>
      <small>{item.rule || RUBRIC_ITEMS.find(base => base.key === item.key)?.hint}</small>
    </li>)}</ul>
    <p>滿分 100 分；人、事、時、地、物與成語須在句中真正寫出才給分。</p>
  </section>;
}
