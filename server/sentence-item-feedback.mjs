// Keep personalized explanations separate from rubric standards and never backfill old answers.
export function itemFeedbackInstruction(items) {
 const schema=Object.fromEntries(items.map(item=>[item.key,{reason:'針對原句的評分原因',suggestion:'學生可操作的修改建議',quote:''}]));
 return `同一份 JSON 必須加上 itemFeedback，為每個採用的評分項目逐一提供這位學生的個別回饋，不能只複述評分標準。每項 reason、suggestion 各用約20至50個繁體中文字，最多160字。扣分時 reason 指出原句哪裡有問題或缺少什麼，suggestion 說明可以怎麼補或修改；不得臆造原句沒寫的事實。滿分時 reason 明確說明本項未扣分及原句的具體優點，suggestion 可說明保留哪些寫法，不強行找錯。quote 可逐字引用原句中與本項相關的連續片段；缺少的內容沒有可引用片段時回空字串。不可把建議新寫的文字當作原句引用。人事時地物與課文語詞等由程式核分的項目也要提供相應的個別原因與建議，不可改變既有計分規則。itemFeedback 的結構為 ${JSON.stringify(schema)}。`;
}
export function validateItemFeedback(items,value,sentence,{required=false}={}) {
 if(value===undefined&&!required)return {};
 const fail=()=>{throw Error('AI 分項扣分原因或修改建議不完整，請稍後再試。');};
 if(!value||typeof value!=='object'||Array.isArray(value))fail();
 const result={};
 for(const item of items){
  const feedback=Object.hasOwn(value,item.key)?value[item.key]:null;
  if(!feedback||typeof feedback!=='object'||Array.isArray(feedback))fail();
  const reason=feedback.reason,suggestion=feedback.suggestion,quote=feedback.quote??'';
  if(typeof reason!=='string'||!reason.trim()||reason.length>160||typeof suggestion!=='string'||!suggestion.trim()||suggestion.length>160||typeof quote!=='string'||quote.length>100)fail();
  if(quote.trim()&&!sentence.includes(quote.trim()))throw Error('AI 分項回饋引用內容不在學生原句中。');
  result[item.key]={reason:reason.trim(),suggestion:suggestion.trim(),quote:quote.trim()};
 }
 return result;
}
