'use client';

import { useState } from 'react';
import { Flashcard as FlashcardType } from '@/src/types/flashcard';

interface FlashcardProps {
  card: FlashcardType;
  onDelete: (cardId: string) => void;
}

export const Flashcard = ({ card, onDelete }: FlashcardProps) => {
  const [isFlipped, setIsFlipped] = useState(false);

  return (
    <div className="flex flex-col items-center gap-4">
      <div
        className="w-full max-w-md h-64 cursor-pointer perspective"
        onClick={() => setIsFlipped(!isFlipped)}
        style={{
          perspective: '1000px',
        }}
      >
        <div
          className="relative w-full h-full transition-transform duration-500"
          style={{
            transformStyle: 'preserve-3d',
            transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
          }}
        >
          {/* Front */}
          <div
            className="absolute w-full h-full bg-blue-500 text-white rounded-lg shadow-lg p-8 flex items-center justify-center text-4xl font-bold text-center"
            style={{
              backfaceVisibility: 'hidden',
            }}
          >
            {card.word}
          </div>

          {/* Back */}
          <div
            className="absolute w-full h-full bg-green-500 text-white rounded-lg shadow-lg p-8 flex flex-col items-center justify-center overflow-y-auto"
            style={{
              backfaceVisibility: 'hidden',
              transform: 'rotateY(180deg)',
            }}
          >
            <div className="text-center">
              <p className="text-2xl font-bold mb-4">{card.translation}</p>
              <p className="text-sm italic text-green-100">{card.example}</p>
            </div>
          </div>
        </div>
      </div>

      <p className="text-gray-600 text-sm">Click to flip</p>

      <button
        onClick={() => onDelete(card.id)}
        className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition"
      >
        Delete Card
      </button>
    </div>
  );
};
