import { buildQuiz, createId, deriveHighlights, deriveStats, extractKeywords, summariseConversation } from '@/lib/conversation';
import { deleteRecord as deleteRecordFromStorage, loadRecords, saveRecord as saveRecordToStorage, updateRecordTitle as updateRecordTitleInStorage } from '@/lib/storage/recordsStorage';
import { ChatMessage } from '@/types/chat';
import { ConversationRecord } from '@/types/records';
import { create } from 'zustand';

function createRecord(messages: ChatMessage[], title?: string): ConversationRecord {
  const now = Date.now();
  const keywords = extractKeywords(messages);
  const stats = deriveStats(messages);
  const highlights = deriveHighlights(messages);
  const summary = summariseConversation(messages, keywords);
  const recordId = createId();

  return {
    id: recordId,
    title: title ?? `대화 기록 ${new Date(now).toLocaleDateString('ko-KR')}`,
    summary,
    highlights,
    keywords,
    createdAt: now,
    updatedAt: now,
    stats,
    messages,
    quiz: buildQuiz({ id: recordId, keywords, highlights, stats }),
  };
}

interface RecordsState {
  records: ConversationRecord[];
  hasHydrated: boolean;
  addRecordFromMessages: (input: { messages: ChatMessage[]; title?: string }) => ConversationRecord;
  removeRecord: (id: string) => void;
  getRecord: (id: string) => ConversationRecord | undefined;
  updateRecordTitle: (id: string, title: string) => void;
  hydrate: () => Promise<void>;
}

export const useRecordsStore = create<RecordsState>((set, get) => ({
  records: [],
  hasHydrated: false,
  addRecordFromMessages: ({ messages, title }) => {
    const record = createRecord(messages, title);
    set((state) => ({ records: [record, ...state.records] }));
    void saveRecordToStorage(record);
    return record;
  },
  removeRecord: (id) => {
    set((state) => ({
      records: state.records.filter((record) => record.id !== id),
    }));
    void deleteRecordFromStorage(id);
  },
  getRecord: (id) => get().records.find((record) => record.id === id),
  updateRecordTitle: (id, title) => {
    const nextUpdatedAt = Date.now();
    set((state) => ({
      records: state.records.map((record) =>
        record.id === id ? { ...record, title, updatedAt: nextUpdatedAt } : record,
      ),
    }));
    void updateRecordTitleInStorage(id, title);
  },
  hydrate: async () => {
    if (get().hasHydrated) return;
    try {
      const persistedRecords = await loadRecords();
      set((state) => {
        if (state.hasHydrated) {
          return state;
        }
        const merged = new Map<string, ConversationRecord>();
        for (const record of persistedRecords) {
          merged.set(record.id, record);
        }
        for (const record of state.records) {
          merged.set(record.id, record);
        }
        const ordered = Array.from(merged.values()).sort((a, b) => b.createdAt - a.createdAt);
        return { records: ordered, hasHydrated: true };
      });
    } catch (error) {
      console.error('Failed to hydrate records store', error);
      set({ hasHydrated: true });
    }
  },
}));
