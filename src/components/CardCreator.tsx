'use client';

import { useState } from 'react';
import { Flashcard } from '@/src/types/flashcard';

interface CardCreatorProps {
  onAddCard: (card: Omit<Flashcard, 'id' | 'createdAt'>) => void;
}

export const CardCreator = ({ onAddCard }: CardCreatorProps) => {
  const [word, setWord] = useState('');
  const [translation, setTranslation] = useState('');
  const [example, setExample] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!word.trim() || !translation.trim() || !example.trim()) {
      alert('Please fill in all fields');
      return;
    }

    onAddCard({
      word: word.trim(),
      translation: translation.trim(),
      example: example.trim(),
    });

    setWord('');
    setTranslation('');
    setExample('');
  };

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-md mx-auto bg-gray-100 p-6 rounded-lg shadow-md">
      <h3 className="text-lg font-bold mb-4">Add New Card</h3>

      <div className="mb-4">
        <label htmlFor="word" className="block text-sm font-medium text-gray-700 mb-2">
          Word
        </label>
        <input
          id="word"
          type="text"
          value={word}
          onChange={(e) => setWord(e.target.value)}
          placeholder="Enter word"
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div className="mb-4">
        <label htmlFor="translation" className="block text-sm font-medium text-gray-700 mb-2">
          Translation
        </label>
        <input
          id="translation"
          type="text"
          value={translation}
          onChange={(e) => setTranslation(e.target.value)}
          placeholder="Enter translation"
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div className="mb-6">
        <label htmlFor="example" className="block text-sm font-medium text-gray-700 mb-2">
          Example
        </label>
        <textarea
          id="example"
          value={example}
          onChange={(e) => setExample(e.target.value)}
          placeholder="Enter example sentence"
          rows={3}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <button
        type="submit"
        className="w-full px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition font-semibold"
      >
        Add Card
      </button>
    </form>
  );
};
