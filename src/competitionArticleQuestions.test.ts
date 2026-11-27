import {describe,it,expect,vi} from 'vitest';
import {articleBatches,articlePlanProblem,generateArticleQuestions,ArticleGenerationError} from './competitionArticleQuestions';
import {type quizRequest} from './quizApi';
const context={article:'這是一篇足夠用於閱讀測驗的測試文章。',grade:5,className:'【測試班】',roster:['student@example.com'],onProgress:vi.fn()};
const question=(stem:string,difficulty='易')=>({stem,difficulty,options:['甲','乙','丙','丁'],answer:0,category:'課文理解（閱讀素養）'});
describe('Kahoot 文章難度配額',()=>{
 it('略過零題、每批最多10題，拒絕負數、小數及超過100題',()=>{
  expect(articleBatches({易:12,中:0,難:3})).toEqual([{difficulty:'易',count:10},{difficulty:'易',count:2},{difficulty:'難',count:3}]);
  for(const counts of [{易:0,中:0,難:0},{易:-1,中:1,難:1},{易:1.5,中:1,難:1},{易:100,中:1,難:0}])expect(articlePlanProblem(counts)).not.toBe('');
 });
 it('依所選配額逐批呼叫、帶入前批題目避重，保留每題難度',async()=>{
  let index=0;const mock=vi.fn(async(_path,body)=>({questions:Array.from({length:body.count},()=>question(`測試題目 ${++index}`,body.difficulty))}));
  const result=await generateArticleQuestions({...context,counts:{易:11,中:2,難:1},request:mock as unknown as typeof quizRequest});
  expect(mock.mock.calls.map(([,body])=>[body.count,body.difficulty])).toEqual([[10,'易'],[1,'易'],[2,'中'],[1,'難']]);
  expect(mock.mock.calls[1][1].priorQuestions).toHaveLength(10);expect(result).toHaveLength(14);expect(result.filter(q=>q.difficulty==='易')).toHaveLength(11);expect(result.filter(q=>q.difficulty==='中')).toHaveLength(2);expect(result.filter(q=>q.difficulty==='難')).toHaveLength(1);
 });
 it('中途失敗保留已完成批次，不會自動重試',async()=>{
  const mock=vi.fn().mockResolvedValueOnce({questions:[question('第一道題目')]}).mockRejectedValueOnce(Error('模擬連線失敗'));
  const failure=await generateArticleQuestions({...context,counts:{易:1,中:1,難:0},request:mock as typeof quizRequest}).catch(error=>error);
  expect(failure).toBeInstanceOf(ArticleGenerationError);expect(failure.questions).toHaveLength(1);expect(failure.message).toContain('1／2');expect(mock).toHaveBeenCalledTimes(2);
 });
 it('跨批重複與錯誤難度不得載入',async()=>{
  const duplicate=vi.fn().mockResolvedValueOnce({questions:[question('同一個題目？')]}).mockResolvedValueOnce({questions:[question('同一個題目！','中')]});
  const failure=await generateArticleQuestions({...context,counts:{易:1,中:1,難:0},request:duplicate as typeof quizRequest}).catch(error=>error);
  expect(failure.message).toContain('重複');expect(failure.questions).toHaveLength(1);
  const wrong=vi.fn().mockResolvedValue({questions:[question('錯誤難度','難')]});
  await expect(generateArticleQuestions({...context,counts:{易:1,中:0,難:0},request:wrong as typeof quizRequest})).rejects.toThrow('難度');
 });
 it('量化題答案須有數字，不合法輸入不呼叫模型',async()=>{
  const mock=vi.fn().mockResolvedValue({questions:[question('文章提到多少人？')]});
  await expect(generateArticleQuestions({...context,counts:{易:1,中:0,難:0},request:mock as typeof quizRequest})).rejects.toThrow('數字答案');mock.mockClear();
  await expect(generateArticleQuestions({...context,article:'',counts:{易:1,中:0,難:0},request:mock as typeof quizRequest})).rejects.toThrow('文章');expect(mock).not.toHaveBeenCalled();
 });
});
