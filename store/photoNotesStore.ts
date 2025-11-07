import { createId } from '@/lib/conversation';
import { loadPhotoNotes, persistPhotoNotes } from '@/lib/storage/photoNotesStorage';
import * as FileSystem from 'expo-file-system/legacy';
import { create } from 'zustand';
import type { PhotoNote } from '@/types/photoNote';

const AUDIO_DIRECTORY = `${FileSystem.documentDirectory ?? ''}photo-notes/audio/`;

async function ensureAudioDirectory() {
  if (!AUDIO_DIRECTORY) {
    throw new Error('문서 저장소를 초기화할 수 없습니다.');
  }
  await FileSystem.makeDirectoryAsync(AUDIO_DIRECTORY, { intermediates: true });
}

type CreatePhotoNoteInput = {
  imageId: string;
  description: string;
  audioUri?: string;
};

type PhotoNotesState = {
  notes: PhotoNote[];
  hasHydrated: boolean;
  hydrate: () => Promise<void>;
  addNote: (input: CreatePhotoNoteInput) => Promise<PhotoNote>;
};

async function persistAudioFile(audioUri?: string): Promise<string | undefined> {
  if (!audioUri) return undefined;
  await ensureAudioDirectory();
  const extension = audioUri.split('.').pop() ?? 'm4a';
  const filename = `${createId()}.${extension}`;
  const destination = `${AUDIO_DIRECTORY}${filename}`;
  await FileSystem.copyAsync({
    from: audioUri,
    to: destination,
  });
  await FileSystem.deleteAsync(audioUri, { idempotent: true }).catch(() => undefined);
  return destination;
}

export const usePhotoNotesStore = create<PhotoNotesState>((set, get) => ({
  notes: [],
  hasHydrated: false,
  hydrate: async () => {
    if (get().hasHydrated) return;
    const existing = await loadPhotoNotes();
    set({ notes: existing, hasHydrated: true });
  },
  addNote: async ({ imageId, description, audioUri }) => {
    const now = Date.now();
    const persistedAudioUri = await persistAudioFile(audioUri);
    const note: PhotoNote = {
      id: createId(),
      imageId,
      description,
      audioUri: persistedAudioUri,
      createdAt: now,
      updatedAt: now,
    };
    const nextNotes = [note, ...get().notes];
    set({ notes: nextNotes });
    await persistPhotoNotes(nextNotes);
    return note;
  },
}));
