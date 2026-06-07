export interface Flashcard {
  id: string;
  word: string;
  translation: string;
  example: string;
  createdAt: string;
}

export interface FlashcardSet {
  id: string;
  name: string;
  cards: Flashcard[];
  createdAt: string;
}
