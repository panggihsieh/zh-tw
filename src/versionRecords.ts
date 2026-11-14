export const VERSION_RECORDS_KEY = "hanzi-notebook.version-records.v1";

export interface VersionRecord {
  id: string;
  version: string;
  date: string;
  summary: string;
  submittedAt: string;
}

export function readVersionRecords(
  storage: Pick<Storage, "getItem">,
): VersionRecord[] {
  try {
    const value = JSON.parse(storage.getItem(VERSION_RECORDS_KEY) || "[]");
    if (!Array.isArray(value)) return [];
    return value.filter((item): item is VersionRecord =>
      Boolean(
        item &&
        typeof item.id === "string" &&
        typeof item.version === "string" &&
        typeof item.date === "string" &&
        typeof item.summary === "string" &&
        typeof item.submittedAt === "string",
      ),
    );
  } catch {
    return [];
  }
}

export function addVersionRecord(
  storage: Pick<Storage, "getItem" | "setItem">,
  record: VersionRecord,
) {
  const records = [
    record,
    ...readVersionRecords(storage).filter(
      (item) => item.version !== record.version,
    ),
  ].slice(0, 50);
  storage.setItem(VERSION_RECORDS_KEY, JSON.stringify(records));
  return records;
}
