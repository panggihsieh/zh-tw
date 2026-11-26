import { useEffect, useState } from "react";
import CompetitionStudentPreview from "./CompetitionStudentPreview";
import { readCompetitionPreview } from "./competitionPreviewTab";

export default function CompetitionPreviewPage() {
  const [room] = useState(readCompetitionPreview);

  useEffect(() => {
    window.opener = null;
    document.title = "Kahoot 學生模擬教學";
  }, []);

  return (
    <main>
      <h1>Kahoot 學生模擬教學</h1>
      {room ? (
        <CompetitionStudentPreview room={room} onBack={() => window.close()} backLabel="關閉模擬分頁" />
      ) : (
        <p role="status">請從教師後台的「學生模擬（新分頁）」開啟此分頁。</p>
      )}
    </main>
  );
}
