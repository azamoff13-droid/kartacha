import { FlashcardSet } from '@/src/types/flashcard';

const STORAGE_KEY = 'flashcard-sets';

export const getFlashcardSets = (): FlashcardSet[] => {
  if (typeof window === 'undefined') return [];

  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('Error reading flashcard sets:', error);
    return [];
  }
};

export const saveFlashcardSets = (sets: FlashcardSet[]): void => {
  if (typeof window === 'undefined') return;

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sets));
  } catch (error) {
    console.error('Error saving flashcard sets:', error);
  }
};

export const getFlashcardSetById = (id: string): FlashcardSet | null => {
  const sets = getFlashcardSets();
  return sets.find(set => set.id === id) || null;
};
