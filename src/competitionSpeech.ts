export interface CompetitionRecognition {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onstart?: (() => void) | null;
  onresult: ((event: { resultIndex: number; results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }> }) => void) | null;
  onend: (() => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}

export function sentenceSpeechError(error: string) {
  return ({
    'not-allowed': '麥克風未獲允許。請在網址列的網站設定允許麥克風，再重試。',
    'service-not-allowed': '瀏覽器禁止語音服務，請使用 Chrome 並確認學校裝置允許語音辨識。',
    'audio-capture': '找不到可用麥克風，請檢查麥克風裝置。',
    'network': '語音辨識服務連線失敗。即使麥克風已允許，仍需要能連線到瀏覽器的語音服務；請檢查網路後重試。',
    'no-speech': '沒有辨識到語音，請靠近麥克風，再按開始語音輸入。',
    'aborted': '已停止聆聽，可檢查文字後送出。',
  } as Record<string, string>)[error] || '語音辨識未完成，請重試，或直接輸入句子。';
}

export function configureSentenceRecognition(recognition: CompetitionRecognition, initialText: string, callbacks: { text(value: string): void; message(value: string): void; end(): void }) {
  let received = false, failed = false;
  const timeout = setTimeout(() => {
    failed = true;
    callbacks.end();
    recognition.abort();
    callbacks.message(received ? '已保留辨識文字，請核對後送出。' : '語音服務未在 30 秒內回傳文字。請確認麥克風權限及網路，重試或直接輸入句子。');
  }, 30000);
  recognition.lang = 'zh-TW';
  // One sentence per attempt: finish automatically when the child stops speaking.
  recognition.continuous = false;
  recognition.interimResults = true;
  recognition.onstart = () => callbacks.message('正在聆聽，請說出完整句子；說完稍停，文字會顯示在下方。');
  recognition.onresult = event => {
    const transcript = Array.from(event.results, result => result[0]?.transcript || '').join('');
    if (!transcript.trim()) return;
    received = true;
    callbacks.text((initialText + transcript).slice(0, 300));
    callbacks.message('已辨識語音。說完請稍停，或按停止，再核對文字並送出。');
  };
  recognition.onerror = event => { clearTimeout(timeout); if (failed) return; failed = true; callbacks.message(sentenceSpeechError(event.error)); callbacks.end(); };
  recognition.onend = () => {
    clearTimeout(timeout);
    callbacks.end();
    if (!failed) callbacks.message(received ? '辨識完成，請核對文字；同音錯字可直接修改，再確認送出。' : '尚未收到辨識文字。請確認已按允許麥克風，再重試；也可以直接輸入句子。');
  };
  return () => clearTimeout(timeout);
}
