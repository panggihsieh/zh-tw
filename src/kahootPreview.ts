export async function previewRequest<T>(path: string, body?: unknown): Promise<T> {
 const sentence = body as { transcript?: string; sentence?: string };
 if (path === '/practice/correct') return { suggestion: sentence.transcript ?? '' } as T;
 return { grade: {
  level: '模擬評量', total:85, scores: { correctness:30, completeness:20, fluency:15, detail:15, mechanics:5 },
  feedback: '這是測試回饋，可用來確認送出後的畫面。',
  polished: (sentence.sentence ?? '').trim().replace(/([^。！？!?])$/u, '$1。'),
 } } as T;
}
