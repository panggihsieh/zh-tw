import {it,expect} from 'vitest';
import {strokeTextToZhuyin,strokeAuditionText} from './strokePronunciation';
it('口訣或文字轉填注音，撇固定標第三聲',()=>{
 expect(strokeTextToZhuyin('橫，撇')).toBe('ㄏㄥˊ，ㄆㄧㄝˇ');
 expect(strokeTextToZhuyin('橫鉤')).toBe('ㄏㄥˊ ㄍㄡ');
 expect(strokeTextToZhuyin('橫，左下鉤')).toBe('ㄏㄥˊ，ㄗㄨㄛˇ ㄒㄧㄚˋ ㄍㄡ');
 expect(strokeTextToZhuyin('自訂語句')).toBeNull();
});
it('有注音時也依選定的漢字文字試聽',()=>{
 const row={zhuyin:'ㄆㄧㄝˇ',mnemonic:'橫，撇',spoken:'橫撇'};
 expect(strokeAuditionText(row)).toBe('橫，撇');
 expect(strokeAuditionText({...row,pronunciationSource:'spoken'})).toBe('橫撇');
 expect(strokeAuditionText({...row,pronunciationSource:'mnemonic'})).toBe('橫，撇');
});
