'use client';

import Link from 'next/link';
import { FlashcardSet } from '@/src/types/flashcard';

interface SetsListProps {
  sets: FlashcardSet[];
  onDeleteSet: (setId: string) => void;
}

export const SetsList = ({ sets, onDeleteSet }: SetsListProps) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {sets.map(set => (
        <div key={set.id} className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition">
          <h3 className="text-xl font-bold mb-2">{set.name}</h3>
          <p className="text-gray-600 mb-4">{set.cards.length} ta karta</p>

          <div className="flex gap-2">
            <Link
              href={`/set/${set.id}`}
              className="flex-1 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition text-center font-semibold"
            >
              Mashq qilish
            </Link>
            <button
              onClick={() => {
                if (confirm(`"${set.name}" toʻplamini oʻchirasizmi?`)) {
                  onDeleteSet(set.id);
                }
              }}
              className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition font-semibold"
            >
              Oʻchirish
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};
