import { FlashcardApp } from '@/src/components/FlashcardApp';

export default function Home() {
  return (
    <main style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: '#f5f5f5' }}>
      <FlashcardApp label="Koreys Tili" />
    </main>
  );
}
