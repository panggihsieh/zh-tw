import { useEffect, useState } from "react";
import CompetitionStudentPreview from "./CompetitionStudentPreview";
import { readCompetitionPreview } from "./competitionPreviewTab";

export default function CompetitionPreviewPage() {
  const [room] = useState(readCompetitionPreview);

  useEffect(() => {
    window.opener = null;
    document.title = "Kahoot 學生測試畫面";
  }, []);

  return (
    <main>
      <h1>Kahoot 學生測試畫面</h1>
      {room ? (
        <CompetitionStudentPreview room={room} onBack={() => window.close()} backLabel="關閉測試分頁" />
      ) : (
        <p role="status">請從教師後台的「測試學生畫面」開啟此分頁。</p>
      )}
    </main>
  );
}
