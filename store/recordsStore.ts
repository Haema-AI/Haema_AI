import { buildQuiz, createId, deriveHighlights, deriveStats, extractKeywords, summariseConversation } from '@/lib/conversation';
import { ChatMessage } from '@/types/chat';
import { create } from 'zustand';

type QuizChoice = string;

export type QuizQuestion = {
  id: string;
  question: string;
  choices: QuizChoice[];
  answer: QuizChoice;
  explanation: string;
};

export interface ConversationRecord {
  id: string;
  title: string;
  summary: string;
  highlights: string[];
  keywords: string[];
  createdAt: number;
  updatedAt: number;
  stats: {
    totalTurns: number;
    userTurns: number;
    assistantTurns: number;
    durationMinutes: number;
    riskScore: number;
    moodScore: number;
  };
  messages: ChatMessage[];
  quiz: QuizQuestion[];
}

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
  addRecordFromMessages: (input: { messages: ChatMessage[]; title?: string }) => ConversationRecord;
  removeRecord: (id: string) => void;
  getRecord: (id: string) => ConversationRecord | undefined;
  updateRecordTitle: (id: string, title: string) => void;
}

export const useRecordsStore = create<RecordsState>((set, get) => ({
  records: [],
  addRecordFromMessages: ({ messages, title }) => {
    const record = createRecord(messages, title);
    set((state) => ({ records: [record, ...state.records] }));
    return record;
  },
  removeRecord: (id) =>
    set((state) => ({
      records: state.records.filter((record) => record.id !== id),
    })),
  getRecord: (id) => get().records.find((record) => record.id === id),
  updateRecordTitle: (id, title) =>
    set((state) => ({
      records: state.records.map((record) =>
        record.id === id ? { ...record, title, updatedAt: Date.now() } : record,
      ),
    })),
}));
