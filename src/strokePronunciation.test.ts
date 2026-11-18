import {it,expect} from 'vitest';
import {strokeTextToZhuyin,strokeAuditionText} from './strokePronunciation';
it('口訣或文字轉填注音，撇固定標第三聲',()=>{
 expect(strokeTextToZhuyin('橫，撇')).toBe('ㄏㄥˊ，ㄆㄧㄝˇ');
 expect(strokeTextToZhuyin('橫鉤')).toBe('ㄏㄥˊ ㄍㄡ');
 expect(strokeTextToZhuyin('橫，左下鉤')).toBe('ㄏㄥˊ，ㄗㄨㄛˇ ㄒㄧㄚˋ ㄍㄡ');
 expect(strokeTextToZhuyin('自訂語句')).toBeNull();
});
it('試聽優先採用手動注音，留空才回退選定來源',()=>{
 const row={zhuyin:'ㄆㄧㄝˇ',mnemonic:'橫，撇',spoken:'橫撇'};
 expect(strokeAuditionText(row)).toBe('ㄆㄧㄝˇ');
 expect(strokeAuditionText({...row,zhuyin:'',pronunciationSource:'spoken'})).toBe('橫撇');
 expect(strokeAuditionText({...row,zhuyin:'',pronunciationSource:'mnemonic'})).toBe('橫，撇');
});
