import { BirdMascotIcon } from "./BirdMascot";
import { SITE_VERSION, SITE_UPDATED_AT, SITE_VERSION_SHORT_NOTE } from "./siteVersion";
export default function AcademyBanner({ onVersion }: { onVersion?: () => void }) {
 return <div className="academy-banner"><div className="academy-plaque"><BirdMascotIcon /><span>生字動畫收藏本</span></div><button type="button" className="academy-version" onClick={onVersion} aria-label="網站版本紀錄">v{SITE_VERSION} · {SITE_VERSION_SHORT_NOTE} · <time dateTime={SITE_UPDATED_AT.replaceAll("/", "-")}>{SITE_UPDATED_AT}</time></button></div>;
}
