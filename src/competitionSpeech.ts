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
  let completed = initialText;
  let transcript = "";
  let received = false;
  let stopping = false;
  let closed = false;
  let waitingForEnd = false;
  let restarting = false;
  let editedText: string | undefined;
  let retry: ReturnType<typeof setTimeout> | undefined;
  let stopTimeout: ReturnType<typeof setTimeout> | undefined;
  let startTimeout: ReturnType<typeof setTimeout> | undefined;

  function dispose() {
    closed = true;
    clearTimeout(timeout);
    clearTimeout(retry);
    clearTimeout(stopTimeout);
    clearTimeout(startTimeout);
    recognition.onstart = recognition.onresult = recognition.onerror = recognition.onend = null;
  }

  function finish(message: string) {
    if (closed) return;
    if (editedText !== undefined) callbacks.text(editedText);
    dispose();
    callbacks.end();
    callbacks.message(message);
  }

  function abort() {
    try { recognition.abort(); } catch { /* UI and text have already recovered. */ }
  }

  function requestStop() {
    if (waitingForEnd || closed) return;
    waitingForEnd = true;
    stopTimeout = setTimeout(() => {
      finish('語音服務未回應停止，句子與標點已保留。請重新開始語音輸入，或直接輸入句子。');
      abort();
    }, 2500);
    try { recognition.stop(); } catch {
      finish('無法停止語音辨識，句子與標點已保留。請重新開始語音輸入。');
      abort();
    }
  }

  const timeout = setTimeout(() => {
    finish(received ? '已保留辨識文字，請核對後送出。' : '語音服務未在 30 秒內回傳文字。請重試或直接輸入句子。');
    abort();
  }, 30000);

  recognition.lang = 'zh-TW';
  recognition.continuous = true;
  recognition.interimResults = true;
  recognition.onstart = () => {
    if (closed || waitingForEnd) return;
    restarting = false;
    clearTimeout(startTimeout);
    callbacks.message('正在聆聽，可以停頓後繼續說；標點可直接點選，說完請按停止。');
  };
  recognition.onresult = event => {
    if (closed || editedText !== undefined || retry !== undefined) return;
    restarting = false;
    clearTimeout(startTimeout);
    const next = Array.from(event.results, result => result[0]?.transcript || '').join('');
    if (editedText !== undefined || !next.trim()) return;
    transcript = next;
    received = true;
    callbacks.text((completed + transcript).slice(0, 300));
  };
  recognition.onerror = event => {
    if (closed) return;
    if (event.error !== 'no-speech' || stopping) finish(sentenceSpeechError(event.error));
  };
  recognition.onend = () => {
    if (closed || retry !== undefined || restarting) return;
    clearTimeout(stopTimeout);
    waitingForEnd = false;
    if (stopping) {
      finish(received ? '辨識完成，請核對文字後送出。' : '尚未收到辨識文字，可以重試或直接輸入句子。');
      return;
    }
    completed = editedText ?? (completed + transcript).slice(0, 300);
    editedText = undefined;
    transcript = "";
    retry = setTimeout(() => {
      retry = undefined;
      restarting = true;
      startTimeout = setTimeout(() => {
        finish('語音服務重新啟動未回應，句子與標點已保留。請重試或直接輸入句子。');
        abort();
      }, 3000);
      try {
        recognition.start();
      } catch {
        finish('無法重新啟動語音辨識，請重試或直接輸入句子。');
        abort();
      }
    }, 250);
  };

  return {
    dispose,
    continueWith(text: string) {
      if (closed || stopping) return;
      editedText = text.slice(0, 300);
      if (retry !== undefined) {
        completed = editedText;
        editedText = undefined;
      } else {
        requestStop();
      }
    },
    stop() {
      if (closed || stopping) return;
      stopping = true;
      if (retry !== undefined) finish(received ? '辨識完成，請核對文字後送出。' : '已停止聆聽，請核對文字後送出。');
      else requestStop();
    },
  };
}
