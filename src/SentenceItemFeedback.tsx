import './sentenceItemFeedback.css';
import type {SentenceItemFeedback as Feedback} from './sentenceApi';
export default function SentenceItemFeedback({feedback,fullScore=false}:{feedback?:Feedback;fullScore?:boolean}){
 if(!feedback?.reason||!feedback.suggestion)return <small className="sentence-item-feedback-missing">當次未保存個別扣分原因與修改建議。</small>;
 return <div className="sentence-item-feedback">
  <p><strong>{fullScore?'評分說明':'扣分原因'}：</strong>{feedback.reason}</p>
  <p><strong>修改建議：</strong>{feedback.suggestion}</p>
  {feedback.quote&&<small>原句片段：{feedback.quote}</small>}
 </div>;
}
