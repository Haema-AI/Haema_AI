import { getDatabase } from '@/lib/database';
import type { ConversationRecord } from '@/types/records';

type RecordRow = {
  id: string;
  title: string;
  summary: string;
  highlights_json: string;
  keywords_json: string;
  created_at: number;
  updated_at: number;
  stats_json: string;
  messages_json: string;
  quiz_json: string;
};

function parseJson<T>(input: string, fallback: T): T {
  try {
    return JSON.parse(input) as T;
  } catch {
    return fallback;
  }
}

function mapRowToRecord(row: RecordRow): ConversationRecord {
  return {
    id: row.id,
    title: row.title,
    summary: row.summary,
    highlights: parseJson<string[]>(row.highlights_json, [] as string[]),
    keywords: parseJson<string[]>(row.keywords_json, [] as string[]),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    stats: parseJson<ConversationRecord['stats']>(row.stats_json, {
      totalTurns: 0,
      userTurns: 0,
      assistantTurns: 0,
      durationMinutes: 0,
      riskScore: 0,
      moodScore: 0,
    } as ConversationRecord['stats']),
    messages: parseJson<ConversationRecord['messages']>(row.messages_json, [] as ConversationRecord['messages']),
    quiz: parseJson<ConversationRecord['quiz']>(row.quiz_json, [] as ConversationRecord['quiz']),
  };
}

export async function loadRecords(): Promise<ConversationRecord[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<RecordRow>('SELECT * FROM records ORDER BY created_at DESC');
  return rows.map(mapRowToRecord);
}

export async function saveRecord(record: ConversationRecord) {
  const db = await getDatabase();
  await db.runAsync(
    `INSERT OR REPLACE INTO records (
      id,
      title,
      summary,
      highlights_json,
      keywords_json,
      created_at,
      updated_at,
      stats_json,
      messages_json,
      quiz_json
    ) VALUES (
      $id,
      $title,
      $summary,
      $highlights,
      $keywords,
      $createdAt,
      $updatedAt,
      $stats,
      $messages,
      $quiz
    )`,
    {
      $id: record.id,
      $title: record.title,
      $summary: record.summary,
      $highlights: JSON.stringify(record.highlights),
      $keywords: JSON.stringify(record.keywords),
      $createdAt: record.createdAt,
      $updatedAt: record.updatedAt,
      $stats: JSON.stringify(record.stats),
      $messages: JSON.stringify(record.messages),
      $quiz: JSON.stringify(record.quiz),
    },
  );
}

export async function deleteRecord(id: string) {
  const db = await getDatabase();
  await db.runAsync(`DELETE FROM records WHERE id = $id`, { $id: id });
}

export async function updateRecordTitle(id: string, title: string) {
  const db = await getDatabase();
  await db.runAsync(`UPDATE records SET title = $title, updated_at = $updatedAt WHERE id = $id`, {
    $title: title,
    $id: id,
    $updatedAt: Date.now(),
  });
}
