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
 expect(html).toContain('評分標準：語詞用法正確');expect(html).toContain('依據：媽媽');expect(html).toContain('未保存個別評語的項目僅列評分標準。');
});
it('缺少舊資料不虛構評分',()=>{
 expect(renderToStaticMarkup(<MistakeScoreItems/>)).toContain('未保存評分明細');
});
