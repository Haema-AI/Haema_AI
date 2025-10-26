import { clearChatMessages, loadChatMessages, saveChatMessage } from '@/lib/storage/chatStorage';
import { ChatMessage } from '@/types/chat';
import { create } from 'zustand';

export interface ChatState {
  messages: ChatMessage[];
  isResponding: boolean;
  hasHydrated: boolean;
  addMessage: (message: ChatMessage) => void;
  addAssistantMessage: (text: string) => ChatMessage;
  setResponding: (responding: boolean) => void;
  reset: () => void;
  hydrate: () => Promise<void>;
}

export const useChatStore = create<ChatState>((set, get) => ({
  messages: [],
  isResponding: false,
  hasHydrated: false,
  addMessage: (message) => {
    set((state) => ({ messages: [...state.messages, message] }));
    void saveChatMessage(message);
  },
  addAssistantMessage: (text) => {
    const assistantMessage: ChatMessage = {
      id: `${Date.now()}-assistant`,
      role: 'assistant',
      text,
      ts: Date.now(),
    };
    set((state) => ({ messages: [...state.messages, assistantMessage] }));
    void saveChatMessage(assistantMessage);
    return assistantMessage;
  },
  setResponding: (isResponding) => set({ isResponding }),
  reset: () => {
    set((state) => ({ messages: [], isResponding: false, hasHydrated: state.hasHydrated }));
    void clearChatMessages();
  },
  hydrate: async () => {
    if (get().hasHydrated) return;
    try {
      const persistedMessages = await loadChatMessages();
      set((state) => {
        if (state.hasHydrated) {
          return state;
        }
        const merged = new Map<string, ChatMessage>();
        for (const message of persistedMessages) {
          merged.set(message.id, message);
        }
        for (const message of state.messages) {
          merged.set(message.id, message);
        }
        const ordered = Array.from(merged.values()).sort((a, b) => a.ts - b.ts);
        return { messages: ordered, hasHydrated: true };
      });
    } catch (error) {
      console.error('Failed to hydrate chat messages', error);
      set({ hasHydrated: true });
    }
  },
}));
