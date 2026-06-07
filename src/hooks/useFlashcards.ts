'use client';

import { useState, useEffect } from 'react';
import { Flashcard, FlashcardSet } from '@/src/types/flashcard';
import { getFlashcardSets, saveFlashcardSets, getFlashcardSetById } from '@/src/lib/storage';

export const useFlashcards = () => {
  const [sets, setSets] = useState<FlashcardSet[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load sets from localStorage on mount
  useEffect(() => {
    setIsLoading(true);
    const loadedSets = getFlashcardSets();
    setSets(loadedSets);
    setIsLoading(false);
  }, []);

  const createSet = (name: string): FlashcardSet => {
    const newSet: FlashcardSet = {
      id: Date.now().toString(),
      name,
      cards: [],
      createdAt: new Date().toISOString(),
    };
    const updatedSets = [...sets, newSet];
    setSets(updatedSets);
    saveFlashcardSets(updatedSets);
    return newSet;
  };

  const deleteSet = (setId: string): void => {
    const updatedSets = sets.filter(set => set.id !== setId);
    setSets(updatedSets);
    saveFlashcardSets(updatedSets);
  };

  const addCardToSet = (setId: string, card: Omit<Flashcard, 'id' | 'createdAt'>): void => {
    const updatedSets = sets.map(set => {
      if (set.id === setId) {
        const newCard: Flashcard = {
          ...card,
          id: Date.now().toString(),
          createdAt: new Date().toISOString(),
        };
        return { ...set, cards: [...set.cards, newCard] };
      }
      return set;
    });
    setSets(updatedSets);
    saveFlashcardSets(updatedSets);
  };

  const deleteCard = (setId: string, cardId: string): void => {
    const updatedSets = sets.map(set => {
      if (set.id === setId) {
        return { ...set, cards: set.cards.filter(card => card.id !== cardId) };
      }
      return set;
    });
    setSets(updatedSets);
    saveFlashcardSets(updatedSets);
  };

  const getSetById = (id: string): FlashcardSet | null => {
    return sets.find(set => set.id === id) || null;
  };

  return {
    sets,
    isLoading,
    createSet,
    deleteSet,
    addCardToSet,
    deleteCard,
    getSetById,
  };
};
