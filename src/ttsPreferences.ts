export interface VoicePreference {
  voiceURI: string;
  name: string;
  lang: string;
  localService: boolean;
}
export const TTS_PREFERENCE_KEY = "hanzi-notebook.tts-default.v1";
export function isChineseVoice(voice: { lang: string }) {
  return /^(zh|cmn)([-_]|$)/i.test(voice.lang);
}
export function voiceKey(voice: VoicePreference) {
  return JSON.stringify([
    voice.voiceURI,
    voice.name,
    voice.lang,
    voice.localService,
  ]);
}
export function voicePreference(voice: SpeechSynthesisVoice): VoicePreference {
  return {
    voiceURI: voice.voiceURI,
    name: voice.name,
    lang: voice.lang,
    localService: voice.localService,
  };
}
export function preferredVoice(
  voices: SpeechSynthesisVoice[],
  preference: VoicePreference | null,
) {
  return preference
    ? voices.find(
        (v) => voiceKey(v) === voiceKey(preference) && isChineseVoice(v),
      )
    : undefined;
}
export function selectVoice(
  voices: SpeechSynthesisVoice[],
  preference: VoicePreference | null,
) {
  return (
    preferredVoice(voices, preference) ||
    voices.find((v) => /^(zh|cmn)[-_]TW$/i.test(v.lang)) ||
    voices.find((v) => /^(zh|cmn)[-_]Hant/i.test(v.lang)) ||
    voices.find(isChineseVoice)
  );
}
export function loadVoicePreference(
  storage: Pick<Storage, "getItem">,
): VoicePreference | null {
  try {
    const value = JSON.parse(storage.getItem(TTS_PREFERENCE_KEY) || "null");
    if (
      !value ||
      !["voiceURI", "name", "lang"].every(
        (k) =>
          typeof value[k] === "string" &&
          value[k].length > 0 &&
          value[k].length < 500,
      ) ||
      typeof value.localService !== "boolean" ||
      !isChineseVoice(value)
    )
      return null;
    return {
      voiceURI: value.voiceURI,
      name: value.name,
      lang: value.lang,
      localService: value.localService,
    };
  } catch {
    return null;
  }
}
export function saveVoicePreference(
  storage: Pick<Storage, "setItem" | "removeItem">,
  preference: VoicePreference | null,
) {
  if (preference)
    storage.setItem(TTS_PREFERENCE_KEY, JSON.stringify(preference));
  else storage.removeItem(TTS_PREFERENCE_KEY);
}
