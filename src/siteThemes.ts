import { doc, onSnapshot, runTransaction, collection } from "firebase/firestore";
import { useEffect, useState, type CSSProperties } from "react";
import { cloudConfigured, cloudServices } from "./cloudSync";
import { isAdmin } from "./userAccess";

export const colorKeys = ["primary", "dark", "accent", "background", "surface", "ink", "border"] as const;
export interface SiteTheme {
  id: string;
  name: string;
  colors: Record<typeof colorKeys[number], string>;
  radius: number;
}
export const builtInThemes: SiteTheme[] = [
  { id: "forest-adventure", name: "森林冒險", radius: 24, colors: {
    primary: "#16844d", dark: "#075d3e", accent: "#ffcc43", background: "#eef9df",
    surface: "#fffff5", ink: "#173b2b", border: "#badb97",
  } },
  { id: "quiet-reading", name: "清新閱讀", radius: 12, colors: {
    primary: "#285d50", dark: "#20483e", accent: "#ebc994", background: "#f8f9f5",
    surface: "#ffffff", ink: "#293f36", border: "#d5dfcf",
  } },
];
export function parseSiteTheme(value: unknown): SiteTheme {
  const t = value as SiteTheme;
  if (!t || !/^[a-z0-9-]{1,60}$/.test(t.id) || typeof t.name !== "string" ||
      !t.name.trim() || t.name.length > 40 || !Number.isInteger(t.radius) || t.radius < 8 || t.radius > 32 ||
      !t.colors || colorKeys.some(k => !/^#[0-9a-f]{6}$/i.test(t.colors[k])))
    throw Error("樣式資料不完整，請確認名稱與色碼。");
  return { id: t.id, name: t.name.trim(), radius: t.radius,
    colors: Object.fromEntries(colorKeys.map(k => [k, t.colors[k]])) as SiteTheme["colors"] };
}
export function themeVariables(theme: SiteTheme): CSSProperties {
  return Object.fromEntries([...colorKeys.map(k => [`--theme-${k}`, theme.colors[k]]),
    ["--theme-radius", `${theme.radius}px`]]) as CSSProperties;
}
export function useSiteTheme() {
  const [theme, setTheme] = useState(builtInThemes[0]);
  useEffect(() => {
    if (!cloudConfigured) return;
    return onSnapshot(doc(cloudServices().db, "hanzi_notebook_settings", "websiteTheme"), snapshot => {
      if (snapshot.exists()) {
        try { setTheme(parseSiteTheme(snapshot.data())); } catch { /* Keep a valid theme. */ }
      }
    }, () => { /* The built-in theme remains available before rules are deployed. */ });
  }, []);
  useEffect(() => {
    const root = document.documentElement;
    root.dataset.siteTheme = theme.id;
    const vars = themeVariables(theme);
    Object.entries(vars).forEach(([key, value]) => root.style.setProperty(key, String(value)));
    return () => {
      delete root.dataset.siteTheme;
      Object.keys(vars).forEach(key => root.style.removeProperty(key));
    };
  }, [theme]);
  return theme;
}
export function watchThemeLibrary(update: (themes: SiteTheme[]) => void, fail: () => void) {
  if (!cloudConfigured) { fail(); return () => {}; }
  return onSnapshot(collection(cloudServices().db, "hanzi_notebook_themes"), snapshot => {
    try {
      const themes = new Map(builtInThemes.map(t => [t.id, t]));
      snapshot.docs.forEach(d => { const t = parseSiteTheme(d.data()); if (d.id === t.id) themes.set(t.id, t); });
      update([...themes.values()]);
    } catch { fail(); }
  }, fail);
}
export async function saveSiteTheme(value: SiteTheme, apply = false) {
  if (!cloudConfigured) throw Error("尚未設定雲端連線。");
  const { auth, db } = cloudServices();
  if (!isAdmin(auth.currentUser)) throw Error("僅管理者可儲存及套用網站樣式。");
  const theme = parseSiteTheme(value);
  await runTransaction(db, async tx => {
    const activeRef = doc(db, "hanzi_notebook_settings", "websiteTheme");
    const active = await tx.get(activeRef);
    tx.set(doc(db, "hanzi_notebook_themes", theme.id), theme);
    if (apply || (active.exists() && active.data().id === theme.id)) tx.set(activeRef, theme);
  });
}
