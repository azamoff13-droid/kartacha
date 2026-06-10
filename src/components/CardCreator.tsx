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
  const [message, setMessage] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!word.trim() || !translation.trim() || !example.trim()) {
      setMessage('Soʻz, tarjima va misolni toʻldiring.');
      return;
    }

    setIsSaving(true);
    onAddCard({
      word: word.trim(),
      translation: translation.trim(),
      example: example.trim(),
    });

    setWord('');
    setTranslation('');
    setExample('');
    setMessage('Karta saqlandi.');
    setIsSaving(false);
  };

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-md mx-auto bg-gray-100 p-6 rounded-lg shadow-md">
      <h3 className="text-lg font-bold mb-4">Yangi karta</h3>

      <div className="mb-4">
        <label htmlFor="word" className="block text-sm font-medium text-gray-700 mb-2">
          Soʻz
        </label>
        <input
          id="word"
          type="text"
          value={word}
          onChange={(e) => {
            setWord(e.target.value);
            setMessage('');
          }}
          placeholder="Soʻzni kiriting"
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div className="mb-4">
        <label htmlFor="translation" className="block text-sm font-medium text-gray-700 mb-2">
          Tarjima
        </label>
        <input
          id="translation"
          type="text"
          value={translation}
          onChange={(e) => {
            setTranslation(e.target.value);
            setMessage('');
          }}
          placeholder="Tarjimasini kiriting"
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div className="mb-6">
        <label htmlFor="example" className="block text-sm font-medium text-gray-700 mb-2">
          Misol
        </label>
        <textarea
          id="example"
          value={example}
          onChange={(e) => {
            setExample(e.target.value);
            setMessage('');
          }}
          placeholder="Misol jumla yozing"
          rows={3}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {message && (
        <p className="mb-4 text-sm text-gray-600" role="status">
          {message}
        </p>
      )}

      <button
        type="submit"
        disabled={isSaving}
        className="w-full px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition font-semibold"
      >
        {isSaving ? 'Saqlanmoqda...' : 'Kartani qoʻshish'}
      </button>
    </form>
  );
};
