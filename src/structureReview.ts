import { useEffect, useState } from "react";
import { onAuthStateChanged, type User } from "firebase/auth";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { cloudConfigured, cloudServices } from "./cloudSync";
import { isAdmin } from "./userAccess";
import type { CharacterMaster } from "./model";

export function structureFingerprint(master: CharacterMaster) {
  return JSON.stringify([master.character, master.version, master.structure, master.layout, master.components, master.radical]);
}
export function confirmedStructureLabel(label: string) {
  return label.replace(/（候選[，,、 ]*待核對）/gu, "（已確認）").replace(/待核對/gu, "已確認");
}
export function useUserRole() {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(!cloudConfigured);
  useEffect(() => {
    if (!cloudConfigured) return;
    try {
      return onAuthStateChanged(cloudServices().auth, (value) => { setUser(value); setReady(true); });
    } catch { setReady(true); }
  }, []);
  return { user, admin: isAdmin(user), ready };
}
export function useStructureReview(master: CharacterMaster | undefined, admin: boolean) {
  const fingerprint = master ? structureFingerprint(master) : "";
  const character = master?.character || "";
  const [approved, setApproved] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    setApproved(""); setError("");
    if (!cloudConfigured || !character) return;
    setLoading(true);
    getDoc(doc(cloudServices().db, "hanzi_notebook_structure_reviews", character))
      .then((snapshot) => {
        if (active && snapshot.exists() && snapshot.data().fingerprint === fingerprint)
          setApproved(fingerprint);
      })
      .catch(() => { if (active) setError("核對狀態載入失敗，請重新整理後再試。"); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [character, fingerprint]);
  const confirmed = !!fingerprint && approved === fingerprint;
  async function confirm() {
    if (!master || master.verificationStatus === "unavailable" || !admin || !isAdmin(cloudServices().auth.currentUser)) return;
    setSaving(true); setError("");
    try {
      await setDoc(doc(cloudServices().db, "hanzi_notebook_structure_reviews", character), {
        character, fingerprint, confirmed: true, confirmedAt: serverTimestamp(),
        confirmedBy: cloudServices().auth.currentUser!.uid,
      });
      setApproved(fingerprint);
    } catch { setError("確認儲存失敗，請檢查登入與權限後重試。"); }
    finally { setSaving(false); }
  }
  return { confirmed, loading, saving, error, confirm };
}
