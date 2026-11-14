import type { Collection } from "./model";
import { CURRICULUM_LIMIT, validatePhrase } from "./model";
import { parseBackup } from "./storage";
import type { SpeechSession } from "./speech";
import { loadVoicePreference } from "./ttsPreferences";
export const SESSION_KEY = "hanzi-notebook.page-state.v1";
export interface PageSession {
  version: 1;
  page: "learn" | "library" | "resources" | "tts";
  input: string;
  phrase: string;
  positions: number[];
  collection: Collection | null;
  cardIndex: number;
  scene: number;
  speed: number;
  showReading: boolean;
  captions: boolean;
  voice: boolean;
  reduced: boolean;
  simple: boolean;
  grade: string;
  wordCount: number;
  revealed: string[];
  search: string;
  filter: string;
  modal: "settings" | "export" | null;
  scrollY: number;
  speech: SpeechSession | null;
}
export function defaultPageSession(
  reduced = false,
  initialPhrase = "感謝",
): PageSession {
  return {
    version: 1,
    page: "learn",
    input: initialPhrase,
    phrase: initialPhrase,
    positions: Array.from(initialPhrase).map((_, index) => index),
    collection: null,
    cardIndex: 0,
    scene: 0,
    speed: 1,
    showReading: true,
    captions: true,
    voice: true,
    reduced,
    simple: false,
    grade: "四年級",
    wordCount: 3,
    revealed: [],
    search: "",
    filter: "all",
    modal: null,
    scrollY: 0,
    speech: null,
  };
}
export function loadPageSession(
  storage: Pick<Storage, "getItem">,
  reduced = false,
  initialPhrase = "感謝",
): PageSession {
  const result = defaultPageSession(reduced, initialPhrase);
  try {
    const text = storage.getItem(SESSION_KEY);
    if (!text || text.length > 2_000_000) return result;
    const data = JSON.parse(text);
    if (data?.version !== 1) return result;
    if (["learn", "library", "resources", "tts"].includes(data.page))
      result.page = data.page;
    if (typeof data.input === "string" && data.input.length <= CURRICULUM_LIMIT * 2)
      result.input = data.input;
    if (
      typeof data.phrase === "string" &&
      (data.phrase === "" || !validatePhrase(data.phrase, CURRICULUM_LIMIT))
    )
      result.phrase = data.phrase;
    if (Array.isArray(data.positions))
      result.positions = [
        ...new Set<number>(
          data.positions.filter(
            (x: unknown) =>
              Number.isInteger(x) &&
              Number(x) >= 0 &&
              Number(x) < Array.from(result.phrase).length,
          ),
        ),
      ].sort((a, b) => a - b);
    result.positions = result.positions.filter(
      (position) => position < Array.from(result.phrase).length,
    );
    if (data.collection) {
      try {
        result.collection = parseBackup(JSON.stringify(data.collection));
      } catch {
        /* keep page and input even if a deck is damaged */
      }
    }
    if (result.collection && Number.isInteger(data.cardIndex))
      result.cardIndex = Math.max(
        0,
        Math.min(result.collection.cards.length - 1, data.cardIndex),
      );
    if (Number.isInteger(data.scene) && data.scene >= 0 && data.scene < 6)
      result.scene = data.scene;
    if ([0.65, 1, 1.5].includes(data.speed)) result.speed = data.speed;
    for (const key of [
      "showReading",
      "captions",
      "voice",
      "reduced",
      "simple",
    ] as const)
      if (typeof data[key] === "boolean") result[key] = data[key];
    if (["四年級", "五年級", "六年級", "低一年級"].includes(data.grade))
      result.grade = data.grade;
    if ([3, 6].includes(data.wordCount)) result.wordCount = data.wordCount;
    if (Array.isArray(data.revealed))
      result.revealed = data.revealed
        .filter((s: unknown) => typeof s === "string" && s.length <= 20)
        .slice(0, 9);
    if (typeof data.search === "string" && data.search.length <= 200)
      result.search = data.search;
    if (["all", "practice", "learned"].includes(data.filter))
      result.filter = data.filter;
    if (
      data.modal === "settings" ||
      (data.modal === "export" && result.collection)
    )
      result.modal = data.modal;
    if (Number.isFinite(data.scrollY))
      result.scrollY = Math.max(0, Math.min(data.scrollY, 100_000));
    const speech = data.speech;
    if (
      speech &&
      typeof speech.text === "string" &&
      speech.text.length <= 100_000 &&
      Number.isFinite(speech.position) &&
      [0.7, 0.85, 1.1].includes(speech.rate)
    )
      result.speech = {
        text: speech.text,
        position: Math.max(
          0,
          Math.min(Array.from(speech.text).length, Math.floor(speech.position)),
        ),
        rate: speech.rate,
        preference: loadVoicePreference({
          getItem: () => JSON.stringify(speech.preference),
        }),
      };
  } catch {
    /* no stored state must never prevent opening the app */
  }
  return result;
}
export function savePageSession(
  storage: Pick<Storage, "setItem">,
  state: PageSession,
) {
  storage.setItem(SESSION_KEY, JSON.stringify(state));
}
