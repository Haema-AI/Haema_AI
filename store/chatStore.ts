import { ChatMessage } from '@/types/chat';
import { create } from 'zustand';

export interface ChatState {
  messages: ChatMessage[];
  isResponding: boolean;
  addMessage: (message: ChatMessage) => void;
  addAssistantMessage: (text: string) => ChatMessage;
  setResponding: (responding: boolean) => void;
  reset: () => void;
}

export const useChatStore = create<ChatState>((set) => ({
  messages: [],
  isResponding: false,
  addMessage: (message) => set((state) => ({ messages: [...state.messages, message] })),
  addAssistantMessage: (text) => {
    const assistantMessage: ChatMessage = {
      id: `${Date.now()}-assistant`,
      role: 'assistant',
      text,
      ts: Date.now(),
    };
    set((state) => ({ messages: [...state.messages, assistantMessage] }));
    return assistantMessage;
  },
  setResponding: (isResponding) => set({ isResponding }),
  reset: () => set({ messages: [], isResponding: false }),
}));
