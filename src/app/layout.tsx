import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Flashcard Vocabulary',
  description: 'Learn foreign languages with flashcards',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
