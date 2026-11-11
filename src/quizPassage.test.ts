import {expect,test} from 'vitest';
import {readQuizPassage} from './quizPassage';
test('課文檔案保留文字及段落，不將空白或過大內容送入出題流程',async()=>{
  expect(await readQuizPassage(new File(['\uFEFF第一段。\r\n第二段。'],'lesson.txt'))).toBe('第一段。\n第二段。');
  await expect(readQuizPassage(new File(['   '],'lesson.md'))).rejects.toThrow('沒有讀到文字');
  await expect(readQuizPassage(new File(['字'.repeat(12001)],'lesson.txt'))).rejects.toThrow('12000');
  await expect(readQuizPassage(new File(['圖片'],'lesson.png'))).rejects.toThrow('TXT');
  await expect(readQuizPassage(new File([new Uint8Array(10*1024*1024+1)],'lesson.txt'))).rejects.toThrow('10MB');
});
