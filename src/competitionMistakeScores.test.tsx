import {expect,it} from 'vitest';
import {renderToStaticMarkup} from 'react-dom/server';
import {MistakeScoreItems} from './CompetitionMistakeReview';
it('列出全部配分、零分與說明，區分個別依據和評分標準',()=>{
 const html=renderToStaticMarkup(<MistakeScoreItems items={[
  {key:'correctness',label:'用詞正確',points:30,score:0,evidence:'',criterion:'語詞用法正確'},
  {key:'person',label:'人',points:10,score:10,evidence:'媽媽',criterion:'寫出人物'},
  {key:'custom',label:'老師自訂',points:60,score:null,evidence:'',criterion:'寫出感受'},
 ]}/>).replace(/<!--.*?-->/g,'');
 expect(html).toContain('0／30');expect(html).toContain('10／10');expect(html).toContain('未保存／60');
 expect(html).toContain('查看評分標準');expect(html).toContain('語詞用法正確');expect(html).toContain('計分依據：媽媽');expect(html).toContain('當次未保存個別扣分原因與修改建議。');
});
it('缺少舊資料不虛構評分',()=>{
 expect(renderToStaticMarkup(<MistakeScoreItems/>)).toContain('未保存評分明細');
});

it('個別扣分原因與修改建議直接呈現，滿分顯示評分說明',()=>{
 const html=renderToStaticMarkup(<MistakeScoreItems items={[
  {key:'completeness',label:'句意完整',points:20,score:5,evidence:'',criterion:'句子完整',deductionReason:'只寫出藉由手機這個途徑，還沒說明事情。',suggestion:'在手機後面補上聯絡誰及聯絡目的。',feedbackQuote:'藉由手機'},
  {key:'person',label:'人',points:10,score:10,evidence:'媽媽',criterion:'寫出人物',deductionReason:'本項未扣分，句中明確寫出媽媽。',suggestion:'保留媽媽作為主詞。',feedbackQuote:'媽媽'},
 ]}/>).replace(/<!--.*?-->/g,'');
 expect(html).toContain('扣分原因');expect(html).toContain('只寫出藉由手機這個途徑');expect(html).toContain('修改建議');expect(html).toContain('在手機後面補上聯絡誰及聯絡目的');expect(html).toContain('評分說明');expect(html).not.toContain('當次未保存個別扣分原因');
});
