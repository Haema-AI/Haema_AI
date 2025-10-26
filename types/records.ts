import type { ChatMessage } from '@/types/chat';

export type QuizChoice = string;

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
