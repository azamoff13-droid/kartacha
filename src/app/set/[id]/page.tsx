'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useFlashcards } from '@/src/hooks/useFlashcards';
import { Flashcard } from '@/src/components/Flashcard';
import { CardCreator } from '@/src/components/CardCreator';
import { FlashcardSet } from '@/src/types/flashcard';

export default function StudyPage({ params }: { params: { id: string } }) {
  const { getSetById, addCardToSet, deleteCard, sets } = useFlashcards();
  const [set, setSet] = useState<FlashcardSet | null>(null);
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    setIsLoading(true);
    const loadedSet = getSetById(params.id);
    setSet(loadedSet);
    setIsLoading(false);
  }, [params.id, sets]);

  const handleAddCard = useCallback((card: any) => {
    addCardToSet(params.id, card);
    setShowForm(false);
    // Update local set state after adding card
    setTimeout(() => {
      const updatedSet = getSetById(params.id);
      setSet(updatedSet);
    }, 0);
  }, [params.id, addCardToSet, getSetById]);

  const handleDeleteCard = useCallback((cardId: string) => {
    deleteCard(params.id, cardId);
    if (currentCardIndex > 0) {
      setCurrentCardIndex(currentCardIndex - 1);
    }
    // Update local set state after deleting card
    setTimeout(() => {
      const updatedSet = getSetById(params.id);
      setSet(updatedSet);
    }, 0);
  }, [params.id, deleteCard, currentCardIndex, getSetById]);

  const handleNextCard = () => {
    if (set && currentCardIndex < set.cards.length - 1) {
      setCurrentCardIndex(currentCardIndex + 1);
    }
  };

  const handlePrevCard = () => {
    if (currentCardIndex > 0) {
      setCurrentCardIndex(currentCardIndex - 1);
    }
  };

  if (isLoading || !set) {
    return <div className="flex items-center justify-center min-h-screen">Yuklanmoqda...</div>;
  }

  const currentCard = set.cards[currentCardIndex];

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto px-4 py-12">
        <div className="flex justify-between items-center mb-8">
          <div>
            <Link href="/" className="text-blue-500 hover:text-blue-600 mb-4 block">
              ← Toʻplamlarga qaytish
            </Link>
            <h1 className="text-3xl font-bold">{set.name}</h1>
            <p className="text-gray-600 mt-2">{set.cards.length} ta karta</p>
          </div>
        </div>

        {set.cards.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg shadow-md">
            <p className="text-gray-500 text-lg mb-4">Bu toʻplamda hali karta yoʻq.</p>
            <button
              onClick={() => setShowForm(true)}
              className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition font-semibold"
            >
              Birinchi kartani qoʻshish
            </button>
          </div>
        ) : (
          <>
            <div className="mb-8">
              <div className="mb-4 text-center">
                <p className="text-gray-600">
                  Karta {currentCardIndex + 1} / {set.cards.length}
                </p>
                <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                  <div
                    className="bg-blue-500 h-2 rounded-full transition-all"
                    style={{ width: `${((currentCardIndex + 1) / set.cards.length) * 100}%` }}
                  ></div>
                </div>
              </div>

              {currentCard && (
                <Flashcard
                  card={currentCard}
                  onDelete={() => handleDeleteCard(currentCard.id)}
                />
              )}
            </div>

            <div className="flex gap-4 justify-center mb-8">
              <button
                onClick={handlePrevCard}
                disabled={currentCardIndex === 0}
                className="px-6 py-2 bg-gray-400 text-white rounded hover:bg-gray-500 disabled:opacity-50 disabled:cursor-not-allowed transition font-semibold"
              >
                Oldingi
              </button>
              <button
                onClick={handleNextCard}
                disabled={currentCardIndex === set.cards.length - 1}
                className="px-6 py-2 bg-gray-400 text-white rounded hover:bg-gray-500 disabled:opacity-50 disabled:cursor-not-allowed transition font-semibold"
              >
                Keyingisi
              </button>
            </div>

            <div className="flex justify-center mb-8">
              <button
                onClick={() => setShowForm(!showForm)}
                className="px-6 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition font-semibold"
              >
                {showForm ? 'Bekor qilish' : 'Yangi karta qoʻshish'}
              </button>
            </div>
          </>
        )}

        {showForm && (
          <div className="mt-8">
            <CardCreator onAddCard={handleAddCard} />
          </div>
        )}
      </div>
    </main>
  );
}
