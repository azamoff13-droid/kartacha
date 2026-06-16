'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { signIn, signOut, useSession } from 'next-auth/react';
import { DECKS } from '@/src/lib/decks';
import '@/src/styles/flashcards.css';

const LS_KEY = 'fc-app-v1';
const DEMO_USER_KEY = 'demo';
const EVT = 'fc-app-sync';
const DAILY_NEW_LIMIT = 5;
const DAILY_REVIEW_LIMIT = 15;

type Rating = 'again' | 'hard' | 'good' | 'easy';
type CardFilter = 'all' | 'new' | 'due' | 'hard' | 'mastered';

interface ReviewState {
  rating: Rating;
  dueAt: number;
  intervalDays: number;
  reps: number;
  lapses: number;
}

interface CardRecord {
  id?: string;
  source?: 'base' | 'custom';
  front: string;
  pos: string;
  translation: string;
  example?: string;
  createdAt?: number;
  updatedAt?: number;
}

interface SessionStats {
  reviewed: number;
  xp: number;
  tomorrow: number;
}

interface QueuePlan {
  new: number;
  review: number;
}

interface HardWord {
  id: string;
  front: string;
  translation: string;
  rating: Extract<Rating, 'again' | 'hard'>;
  dueLabel: string;
}

interface ActivityState {
  streak: number;
  bestStreak: number;
  lastStudyDate?: string;
  totalReviews: number;
}

interface Store {
  deckKey: string;
  dark: boolean;
  known: Record<string, Record<string, boolean>>;
  custom: Record<string, CardRecord[]>;
  reviews: Record<string, Record<string, ReviewState>>;
  activity: ActivityState;
}

interface AuthConfig {
  google: boolean;
}

function storageKeyFor(userKey: string) {
  return `${LS_KEY}:${userKey}`;
}

function todayKey(now = new Date()) {
  return now.toISOString().slice(0, 10);
}

function daysBetween(a: string, b: string) {
  const start = new Date(`${a}T00:00:00.000Z`).getTime();
  const end = new Date(`${b}T00:00:00.000Z`).getTime();
  return Math.round((end - start) / (24 * 60 * 60 * 1000));
}

function defaultActivity(): ActivityState {
  return { streak: 0, bestStreak: 0, totalReviews: 0 };
}

function updateActivity(activity: ActivityState | undefined) {
  const current = activity || defaultActivity();
  const today = todayKey();
  const gap = current.lastStudyDate ? daysBetween(current.lastStudyDate, today) : null;
  const streak = gap === 0
    ? current.streak || 1
    : gap === 1
      ? (current.streak || 0) + 1
      : 1;

  return {
    streak,
    bestStreak: Math.max(current.bestStreak || 0, streak),
    lastStudyDate: today,
    totalReviews: (current.totalReviews || 0) + 1,
  };
}

function loadStore(storageKey: string): Store {
  const fallback: Store = { deckKey: 'en', dark: false, known: {}, custom: { en: [], ko: [] }, reviews: {}, activity: defaultActivity() };
  try {
    if (typeof window !== 'undefined') {
      const raw = localStorage.getItem(storageKey);
      const legacyRaw = storageKey.endsWith(`:${DEMO_USER_KEY}`) ? localStorage.getItem(LS_KEY) : null;
      const parsed = raw ? JSON.parse(raw) : legacyRaw ? JSON.parse(legacyRaw) : null;
      if (parsed) {
        return {
          ...fallback,
          ...parsed,
          known: parsed.known || {},
          custom: { ...fallback.custom, ...(parsed.custom || {}) },
          reviews: parsed.reviews || {},
          activity: { ...fallback.activity, ...(parsed.activity || {}) },
        };
      }
    }
  } catch (e) {}
  return fallback;
}

function saveStore(storageKey: string, s: Store) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(storageKey, JSON.stringify(s));
  } catch (e) {}
  window.dispatchEvent(new CustomEvent(EVT, { detail: { storageKey, store: s } }));
}

function useStore(storageKey: string) {
  const [store, setStore] = useState<Store>(() => loadStore(storageKey));

  useEffect(() => {
    setStore(loadStore(storageKey));
    const onSync = (e: any) => {
      if (e.detail?.storageKey === storageKey) setStore(e.detail.store);
    };
    window.addEventListener(EVT, onSync);
    return () => window.removeEventListener(EVT, onSync);
  }, [storageKey]);

  const update = useCallback((patch: Partial<Store> | ((prev: Store) => Store)) => {
    setStore((prev) => {
      const next = typeof patch === 'function' ? patch(prev) : { ...prev, ...patch };
      saveStore(storageKey, next);
      return next;
    });
  }, [storageKey]);

  return [store, update] as const;
}

const IconSun = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
    <circle cx="12" cy="12" r="4"/>
    <path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M5.6 18.4l1.4-1.4M17 7l1.4-1.4"/>
  </svg>
);

const IconMoon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z"/>
  </svg>
);

const IconCheck = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 12l5 5L20 6"/></svg>
);

const IconX = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>
);

const IconArrow = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>
);

const IconSpeaker = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 5 6 9H3v6h3l5 4V5z"/><path d="M15.5 8.5a5 5 0 0 1 0 7"/><path d="M18.5 5.5a9 9 0 0 1 0 13"/></svg>
);

const IconSearch = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="7"/><path d="m16 16 4 4"/></svg>
);

const IconGoogle = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
    <path fill="#4285F4" d="M21.6 12.23c0-.78-.07-1.53-.2-2.23H12v4.22h5.38a4.6 4.6 0 0 1-2 3.02v2.51h3.24c1.9-1.75 2.98-4.33 2.98-7.52z"/>
    <path fill="#34A853" d="M12 22c2.7 0 4.97-.9 6.62-2.43l-3.24-2.51c-.9.6-2.04.95-3.38.95-2.6 0-4.8-1.76-5.59-4.12H3.06v2.59A10 10 0 0 0 12 22z"/>
    <path fill="#FBBC05" d="M6.41 13.89A6.02 6.02 0 0 1 6.1 12c0-.65.11-1.29.31-1.89V7.52H3.06A10 10 0 0 0 2 12c0 1.61.39 3.14 1.06 4.48l3.35-2.59z"/>
    <path fill="#EA4335" d="M12 5.99c1.47 0 2.79.51 3.83 1.5l2.86-2.86A9.6 9.6 0 0 0 12 2a10 10 0 0 0-8.94 5.52l3.35 2.59C7.2 7.75 9.4 5.99 12 5.99z"/>
  </svg>
);

const IconDownload = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3v12"/><path d="m7 10 5 5 5-5"/><path d="M5 21h14"/></svg>
);

const IconUpload = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 21V9"/><path d="m7 14 5-5 5 5"/><path d="M5 3h14"/></svg>
);

function cardId(c: CardRecord) {
  if (c.source === 'custom' && c.id) return c.id;
  return c.front;
}

function normalizeFront(value: string) {
  return value.trim().toLocaleLowerCase();
}

function customMatch(card: CardRecord, id: string) {
  return card.id === id || `legacy:${card.front}` === id || card.front === id;
}

function withCardMeta(card: CardRecord, source: 'base' | 'custom'): CardRecord {
  return source === 'custom'
    ? { ...card, source, id: card.id || `legacy:${card.front}` }
    : { ...card, source };
}

function scheduleReview(prev: ReviewState | undefined, rating: Rating, now = Date.now()): ReviewState {
  const currentInterval = prev?.intervalDays || 0;
  const intervalDays = rating === 'again'
    ? 1
    : rating === 'hard'
      ? Math.max(1, Math.ceil(currentInterval * 1.2) || 1)
      : rating === 'good'
        ? Math.max(2, Math.ceil(currentInterval * 2.5) || 2)
        : Math.max(4, Math.ceil(currentInterval * 3.5) || 4);

  return {
    rating,
    intervalDays,
    dueAt: now + intervalDays * 24 * 60 * 60 * 1000,
    reps: (prev?.reps || 0) + 1,
    lapses: (prev?.lapses || 0) + (rating === 'again' ? 1 : 0),
  };
}

function getDailyQueue(cards: CardRecord[], reviewMap: Record<string, ReviewState>) {
  const now = Date.now();
  const due = cards
    .filter((card) => {
      const review = reviewMap[cardId(card)];
      return review && review.dueAt <= now;
    })
    .sort((a, b) => (reviewMap[cardId(a)]?.dueAt || 0) - (reviewMap[cardId(b)]?.dueAt || 0))
    .slice(0, DAILY_REVIEW_LIMIT);
  const fresh = cards
    .filter((card) => !reviewMap[cardId(card)])
    .slice(0, DAILY_NEW_LIMIT);

  return [...due, ...fresh];
}

function countTomorrowReviews(reviewMap: Record<string, ReviewState>) {
  const now = Date.now();
  const tomorrowEnd = now + 2 * 24 * 60 * 60 * 1000;
  return Object.values(reviewMap).filter((review) => review.dueAt > now && review.dueAt <= tomorrowEnd).length;
}

function getDueLabel(dueAt: number, now = Date.now()) {
  if (dueAt <= now) return 'bugun';
  const days = Math.ceil((dueAt - now) / (24 * 60 * 60 * 1000));
  if (days === 1) return 'ertaga';
  return `${days} kunda`;
}

function getHardWords(cards: CardRecord[], reviewMap: Record<string, ReviewState>): HardWord[] {
  return cards
    .map((card) => {
      const id = cardId(card);
      const review = reviewMap[id];
      if (!review || (review.rating !== 'again' && review.rating !== 'hard')) return null;

      return {
        id,
        front: card.front,
        translation: card.translation,
        rating: review.rating,
        dueLabel: getDueLabel(review.dueAt),
      };
    })
    .filter((item): item is HardWord => Boolean(item))
    .sort((a, b) => {
      const ratingWeight = { again: 0, hard: 1 };
      return ratingWeight[a.rating] - ratingWeight[b.rating];
    })
    .slice(0, 4);
}

function filterCard(card: CardRecord, filter: CardFilter, reviewMap: Record<string, ReviewState>, knownSet: Record<string, boolean>) {
  const id = cardId(card);
  const review = reviewMap[id];
  if (filter === 'new') return !review;
  if (filter === 'due') return Boolean(review && review.dueAt <= Date.now());
  if (filter === 'hard') return review?.rating === 'again' || review?.rating === 'hard';
  if (filter === 'mastered') return Boolean(knownSet[id]);
  return true;
}

function shuffle(arr: CardRecord[]) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function speakCard(card: CardRecord | undefined, deckKey: string) {
  if (!card || typeof window === 'undefined' || !('speechSynthesis' in window)) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(card.front);
  utterance.lang = deckKey === 'ko' ? 'ko-KR' : 'en-US';
  utterance.rate = deckKey === 'ko' ? 0.86 : 0.9;
  window.speechSynthesis.speak(utterance);
}

function useAuthConfig() {
  const [config, setConfig] = useState<AuthConfig | null>(null);

  useEffect(() => {
    let alive = true;
    fetch('/api/auth/config')
      .then((res) => res.json())
      .then((data) => {
        if (alive) setConfig({ google: Boolean(data.google) });
      })
      .catch(() => {
        if (alive) setConfig({ google: false });
      });
    return () => {
      alive = false;
    };
  }, []);

  return config;
}

function AuthScreen({ googleReady, onDemo }: { googleReady: boolean; onDemo: () => void }) {
  return (
    <div className="fc-app v-modern">
      <div className="fc-auth-screen">
        <div className="fc-auth-panel">
          <div className="fc-brand auth">
            <span className="fc-brand-mark">Karta·cha</span>
            <span className="fc-brand-sub">Koreys tili</span>
          </div>
          <h1 className="serif">Hisobingizga kiring</h1>
          <p>Progress, qiyin so&apos;zlar va custom kartalar alohida profilingizda saqlanadi.</p>
          <button className="fc-btn primary google" disabled={!googleReady} onClick={() => signIn('google')}>
            <IconGoogle/> Google orqali kirish
          </button>
          {!googleReady && (
            <div className="fc-auth-note">
              Google OAuth hali sozlanmagan. Vercelda `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `NEXTAUTH_SECRET` va `NEXTAUTH_URL` qo&apos;shilganda tugma ishlaydi.
            </div>
          )}
          <button className="fc-btn" onClick={onDemo}>Demo rejimda ko&apos;rish</button>
        </div>
      </div>
    </div>
  );
}

function AccountMenu({
  userLabel,
  demoMode,
  activity,
  onExport,
  onImport,
}: {
  userLabel: string;
  demoMode: boolean;
  activity: ActivityState;
  onExport: () => void;
  onImport: (file: File) => void;
}) {
  return (
    <div className="fc-account-wrap">
      <div className="fc-streak" title="Kunlik streak">
        <strong>{activity.streak || 0}</strong>
        <span>kun</span>
      </div>
      <div className="fc-account">
        <span>{demoMode ? 'Demo' : userLabel}</span>
        {demoMode ? (
          <button className="fc-link-btn" onClick={() => signIn('google')}>Google</button>
        ) : (
          <button className="fc-link-btn" onClick={() => signOut()}>Chiqish</button>
        )}
      </div>
      <div className="fc-backup-tools" aria-label="Backup">
        <button className="fc-icon-btn mini" onClick={onExport} title="Backup yuklab olish">
          <IconDownload/>
        </button>
        <label className="fc-icon-btn mini" title="Backup import qilish">
          <IconUpload/>
          <input type="file" accept="application/json" onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) onImport(file);
            event.target.value = '';
          }}/>
        </label>
      </div>
    </div>
  );
}

function CardsMode({ card, revealed, setRevealed, rateCard, next, prev, catNum, deckCode, deckKey, hasCards, sessionStats, onAddCard, onRestart }: any) {
  if (!card) {
    if (hasCards) {
      return (
        <div className="fc-summary">
          <div className="fc-pos">Session summary</div>
          <h2 className="serif">Bugun tugadi</h2>
          <div className="fc-summary-grid">
            <div>
              <strong>{sessionStats.reviewed}</strong>
              <span>ko&apos;rilgan karta</span>
            </div>
            <div>
              <strong>{sessionStats.xp}</strong>
              <span>XP</span>
            </div>
            <div>
              <strong>{sessionStats.tomorrow}</strong>
              <span>ertaga qaytadi</span>
            </div>
          </div>
          <p>Yangi va review limitlari tugadi. Ertaga qaytadigan so&apos;zlar avtomatik queue&apos;ga tushadi.</p>
          <button className="fc-btn primary" onClick={onRestart}>
            Bugungi queue&apos;ni yangilash <IconArrow/>
          </button>
        </div>
      );
    }

    return (
      <div className="fc-empty">
        <div className="fc-pos">Bugungi mashq</div>
        <h2 className="serif">Bugun karta yo&apos;q</h2>
        <p>
          Mashqni boshlash uchun shu kolodaga birinchi so&apos;zingizni qo&apos;shing.
          Karta saqlangach, u darhol bugungi mashqda chiqadi.
        </p>
        <button className="fc-btn primary" onClick={onAddCard}>
          Yangi karta qo&apos;shish <IconArrow/>
        </button>
      </div>
    );
  }
  return (
    <>
      <div className="fc-shortcuts">
        <span><kbd>Space</kbd> javobni ochish</span>
        <span><kbd>1</kbd> Yana</span>
        <span><kbd>2</kbd> Qiyin</span>
        <span><kbd>3</kbd> Yaxshi</span>
        <span><kbd>4</kbd> Oson</span>
      </div>
      <div className="fc-card-stage">
        <div
          key={cardId(card)}
          className={`fc-card ${revealed ? "revealed" : ""}`}
          onClick={() => setRevealed((r: boolean) => !r)}
          data-num={String(catNum).padStart(4, "0")}
        >
          <button
            className="fc-sound-btn"
            onClick={(event) => {
              event.stopPropagation();
              speakCard(card, deckKey);
            }}
            aria-label="So'zni eshitish"
          >
            <IconSpeaker/>
          </button>
          <div className="fc-card-top">
            <div className="fc-pos">{deckCode} · {card.pos}</div>
            <h2 className="fc-word">{card.front}</h2>
          </div>
          <div className="fc-divider"/>
          <div className="fc-card-bot">
            <div className="fc-trans-block">
              <p className="fc-trans">{card.translation}</p>
              {card.example && <p className="fc-example">&quot;{card.example}&quot;</p>}
            </div>
            {!revealed && (
              <div className="fc-curtain">
                <span className="fc-curtain-chev">↓</span>
                <span>Avval eslang, keyin oching</span>
                <span className="fc-curtain-chev">↓</span>
              </div>
            )}
          </div>
        </div>
      </div>
      <div className="fc-actions">
        <button className="fc-btn" onClick={prev}>← Oldingi</button>
        <button className="fc-btn primary" onClick={() => setRevealed((r: boolean) => !r)}>
          {revealed ? "Yopish" : "Javobni ochish"}
        </button>
        <button className="fc-btn" onClick={next}>Keyingisi →</button>
      </div>
      <div className="fc-rating-actions">
        <button className="fc-btn dunno" onClick={() => rateCard('again')}>
          <IconX/> Yana <span className="kbd">1</span>
        </button>
        <button className="fc-btn hard" onClick={() => rateCard('hard')}>
          Qiyin <span className="kbd">2</span>
        </button>
        <button className="fc-btn know" onClick={() => rateCard('good')}>
          <IconCheck/> Yaxshi <span className="kbd">3</span>
        </button>
        <button className="fc-btn easy" onClick={() => rateCard('easy')}>
          Oson <span className="kbd">4</span>
        </button>
      </div>
    </>
  );
}

function QuizMode({ deckKey, cards }: any) {
  const buildRound = (pool: CardRecord[]) => {
    if (pool.length < 4) return null;
    const ordered = shuffle(pool);
    return ordered.slice(0, Math.min(10, ordered.length)).map((c: CardRecord) => {
      const distractors = shuffle(pool.filter((x: CardRecord) => x.front !== c.front)).slice(0, 3);
      return { card: c, options: shuffle([c, ...distractors]) };
    });
  };

  const [round, setRound] = useState(() => buildRound(cards));
  const [qIdx, setQIdx] = useState(0);
  const [picked, setPicked] = useState<CardRecord | null>(null);
  const [score, setScore] = useState({ right: 0, wrong: 0 });

  useEffect(() => {
    setRound(buildRound(cards));
    setQIdx(0); setPicked(null); setScore({right:0,wrong:0});
  }, [deckKey, cards.length]);

  if (!round) {
    return <div className="fc-soft-message">
      Tez test uchun kamida 4 ta karta kerak. Yana bir nechta so&apos;z qo&apos;shing.
    </div>;
  }

  const cur = round[qIdx];
  if (!cur) {
    return (
      <div className="fc-quiz-done">
        <div className="fc-quiz-q">Bugungi test natijasi</div>
        <div className="fc-quiz-word">{score.right}/{score.right + score.wrong}</div>
        <button className="fc-btn primary"
          onClick={() => { setRound(buildRound(cards)); setQIdx(0); setPicked(null); setScore({right:0,wrong:0}); }}>
          Yana bir marta ishlash <IconArrow/>
        </button>
      </div>
    );
  }

  const onPick = (opt: CardRecord) => {
    if (picked) return;
    setPicked(opt);
    const correct = opt.front === cur.card.front;
    setScore((s) => ({ right: s.right + (correct?1:0), wrong: s.wrong + (correct?0:1) }));
    setTimeout(() => { setQIdx((i) => i + 1); setPicked(null); }, 900);
  };

  return (
    <div className="fc-quiz">
      <div className="fc-quiz-q">{qIdx + 1}/{round.length} · To&apos;g&apos;ri tarjimani tanlang</div>
      <h2 className="fc-quiz-word">{cur.card.front}</h2>
      <div className="fc-quiz-opts">
        {cur.options.map((opt: CardRecord, i: number) => {
          const isPicked = picked === opt;
          const isCorrect = picked && opt.front === cur.card.front;
          const cls = picked ? (isCorrect ? "correct" : (isPicked ? "wrong" : "")) : "";
          return (
            <button key={i} className={`fc-quiz-opt ${cls}`} disabled={!!picked} onClick={() => onPick(opt)}>
              {opt.translation}
            </button>
          );
        })}
      </div>
      <div className="fc-quiz-feedback">
        {picked && (picked.front === cur.card.front ? "To'g'ri, davom etamiz." : `To'g'ri javob: ${cur.card.translation}`)}
      </div>
    </div>
  );
}

function AddMode({ deckKey, deckName, cards, reviewMap, knownSet, onAdd, onUpdate, onDelete }: any) {
  const [front, setFront] = useState("");
  const [translation, setTranslation] = useState("");
  const [pos, setPos] = useState("");
  const [example, setExample] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<CardFilter>('all');
  const [notice, setNotice] = useState("");
  const valid = front.trim() && translation.trim();

  const resetForm = () => {
    setFront("");
    setTranslation("");
    setPos("");
    setExample("");
    setEditingId(null);
  };

  const saveCard = () => {
    if (!valid || isSaving) {
      setNotice("So'z va tarjima majburiy.");
      return;
    }
    setIsSaving(true);
    window.setTimeout(() => {
      const payload = { front: front.trim(), translation: translation.trim(), pos: pos.trim() || "—", example: example.trim() };
      const result = editingId ? onUpdate(editingId, payload) : onAdd(payload);
      setIsSaving(false);
      setNotice(result.message);
      if (result.ok) resetForm();
    }, 180);
  };

  const filteredCards = cards.filter((card: CardRecord) => {
    const q = search.trim().toLocaleLowerCase();
    const matchesSearch = !q || [card.front, card.translation, card.example || '', card.pos].some((part) => part.toLocaleLowerCase().includes(q));
    return matchesSearch && filterCard(card, filter, reviewMap, knownSet);
  });

  return (
    <div className="fc-manage">
      <div className="fc-form">
        <div className="fc-form-head">
          <div className="fc-pos">{editingId ? "Kartani tahrirlash" : "Yangi karta"}</div>
          <h3 className="serif">{deckName}</h3>
        </div>
        <div className="fc-field">
          <label className="fc-label">So&apos;z ({deckKey === "ko" ? "한국어" : "English"})</label>
          <input className="fc-input" value={front} onChange={(e) => setFront(e.target.value)} placeholder={deckKey === "ko" ? "예: 사람" : "e.g. serendipity"}/>
        </div>
        <div className="fc-field">
          <label className="fc-label">Tarjima (O&apos;zbekcha)</label>
          <input className="fc-input" value={translation} onChange={(e) => setTranslation(e.target.value)} placeholder="masalan: kutilmagan baxt"/>
        </div>
        <div className="fc-field">
          <label className="fc-label">So&apos;z turi (ixtiyoriy)</label>
          <input className="fc-input" value={pos} onChange={(e) => setPos(e.target.value)} placeholder="ot · sifat · fe'l..."/>
        </div>
        <div className="fc-field">
          <label className="fc-label">Misol jumla (ixtiyoriy)</label>
          <textarea className="fc-input" value={example} onChange={(e) => setExample(e.target.value)} placeholder="Misol jumlasi..."/>
        </div>
        <p className="fc-form-note">
          Duplicate so&apos;zlar saqlanmaydi. Custom kartalarni pastdagi ro&apos;yxatda tahrirlash yoki o&apos;chirish mumkin.
        </p>
        {notice && <p className="fc-toast" role="status">{notice}</p>}
        <div className="fc-form-actions">
          <button className="fc-btn" disabled={isSaving} onClick={resetForm}>Tozalash</button>
          <button
            className="fc-btn primary"
            disabled={!valid || isSaving}
            onClick={saveCard}>
            {isSaving ? "Saqlanmoqda..." : editingId ? "O'zgarishni saqlash" : "Kartani saqlash"} {!isSaving && <IconArrow/>}
          </button>
        </div>
      </div>

      <div className="fc-library">
        <div className="fc-library-tools">
          <label className="fc-search">
            <IconSearch/>
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Kartadan qidirish"/>
          </label>
          <div className="fc-filter-tabs">
            {[
              ['all', 'Hammasi'],
              ['new', 'New'],
              ['due', 'Due'],
              ['hard', 'Hard'],
              ['mastered', 'Mastered'],
            ].map(([value, label]) => (
              <button key={value} className={filter === value ? 'active' : ''} onClick={() => setFilter(value as CardFilter)}>
                {label}
              </button>
            ))}
          </div>
        </div>
        <div className="fc-library-list">
          {filteredCards.map((card: CardRecord) => {
            const id = cardId(card);
            const review = reviewMap[id];
            return (
              <div className="fc-library-item" key={id}>
                <div>
                  <strong>{card.front}</strong>
                  <span>{card.translation}</span>
                  <em>{review ? `${review.rating} · ${getDueLabel(review.dueAt)}` : 'new'}</em>
                </div>
                {card.source === 'custom' ? (
                  <div className="fc-library-actions">
                    <button onClick={() => {
                      setEditingId(id);
                      setFront(card.front);
                      setTranslation(card.translation);
                      setPos(card.pos === "—" ? "" : card.pos);
                      setExample(card.example || "");
                      setNotice("");
                    }}>Edit</button>
                    <button onClick={() => {
                      if (window.confirm(`"${card.front}" kartasini o'chiraymi?`)) {
                        const result = onDelete(id);
                        setNotice(result.message);
                        if (editingId === id) resetForm();
                      }
                    }}>Delete</button>
                  </div>
                ) : (
                  <span className="fc-base-chip">Base</span>
                )}
              </div>
            );
          })}
          {!filteredCards.length && <div className="fc-soft-message">Bu filterda karta topilmadi.</div>}
        </div>
      </div>
    </div>
  );
}

function HardWordsPanel({ words }: { words: HardWord[] }) {
  if (!words.length) return null;

  return (
    <section className="fc-hard-panel" aria-label="Qiyin so'zlar">
      <div className="fc-hard-head">
        <span>Qiyin so&apos;zlar</span>
        <strong>{words.length}</strong>
      </div>
      <div className="fc-hard-list">
        {words.map((word) => (
          <div className="fc-hard-item" key={word.id}>
            <div>
              <strong>{word.front}</strong>
              <span>{word.translation}</span>
            </div>
            <em>{word.rating === 'again' ? 'Yana' : 'Qiyin'} · {word.dueLabel}</em>
          </div>
        ))}
      </div>
    </section>
  );
}

export function FlashcardApp({ label = "Karta·cha" }: { label?: string }) {
  const { data: session, status } = useSession();
  const authConfig = useAuthConfig();
  const [demoMode, setDemoMode] = useState(false);
  const googleReady = Boolean(authConfig?.google);

  const userKey = useMemo(() => {
    if (session?.user?.email) return session.user.email;
    if (session?.user?.id) return session.user.id;
    return DEMO_USER_KEY;
  }, [session?.user?.email, session?.user?.id]);
  const [store, setStore] = useStore(storageKeyFor(userKey));

  const { deckKey, dark, known, custom, reviews } = store;
  const baseCards = useMemo(() => (DECKS[deckKey]?.cards || []).map((card) => withCardMeta(card, 'base')), [deckKey]);
  const customCards = useMemo(() => (custom[deckKey] || []).map((card) => withCardMeta(card, 'custom')), [custom, deckKey]);
  const allCards = useMemo(() => [...baseCards, ...customCards], [baseCards, customCards]);
  const deckName = DECKS[deckKey]?.name || '';
  const deckCode = DECKS[deckKey]?.code || '';
  const reviewMap = useMemo(() => reviews[deckKey] || {}, [reviews, deckKey]);
  const knownSet = known[deckKey] || {};

  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [mode, setMode] = useState('cards');
  const [sessionDone, setSessionDone] = useState(false);
  const [sessionStats, setSessionStats] = useState<SessionStats>({ reviewed: 0, xp: 0, tomorrow: 0 });
  const [sessionQueueIds, setSessionQueueIds] = useState<string[]>([]);
  const [queuePlan, setQueuePlan] = useState<QueuePlan>({ new: 0, review: 0 });
  const [backupNotice, setBackupNotice] = useState("");

  useEffect(() => {
    const plannedReviewMap = reviews[deckKey] || {};
    const plannedQueue = getDailyQueue(allCards, plannedReviewMap);
    setIndex(0);
    setRevealed(false);
    setSessionDone(false);
    setSessionStats({ reviewed: 0, xp: 0, tomorrow: 0 });
    setSessionQueueIds(plannedQueue.map(cardId));
    setQueuePlan({
      new: plannedQueue.filter((item) => !plannedReviewMap[cardId(item)]).length,
      review: plannedQueue.filter((item) => !!plannedReviewMap[cardId(item)]).length,
    });
    // The queue is intentionally snapshotted only when the deck/card count changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deckKey, allCards.length]);

  const dailyQueue = useMemo(() => {
    const cardsById = new Map(allCards.map((item) => [cardId(item), item]));
    return sessionQueueIds.map((id) => cardsById.get(id)).filter(Boolean) as CardRecord[];
  }, [allCards, sessionQueueIds]);
  const card = sessionDone ? undefined : dailyQueue[index];
  const knownCount = Object.keys(knownSet).filter((k) => knownSet[k]).length;
  const progress = allCards.length ? knownCount / allCards.length : 0;
  const retentionPercent = Math.round(progress * 100);
  const reviewedCount = Object.keys(reviewMap).length;
  const dueCount = Object.values(reviewMap).filter((review) => review.dueAt <= Date.now()).length;
  const currentCardLabel = dailyQueue.length && card ? `${index + 1}/${dailyQueue.length}` : "0/0";

  const deckBadges = useMemo(() => {
    return Object.fromEntries(Object.entries(DECKS).map(([key, deck]) => {
      const deckCards = [
        ...deck.cards.map((item) => withCardMeta(item, 'base')),
        ...(custom[key] || []).map((item) => withCardMeta(item, 'custom')),
      ];
      return [key, getDailyQueue(deckCards, reviews[key] || {}).length];
    }));
  }, [custom, reviews]);

  const next = useCallback(() => {
    setIndex((i) => {
      if (i + 1 >= dailyQueue.length) {
        setSessionDone(true);
        return i;
      }
      return i + 1;
    });
    setRevealed(false);
  }, [dailyQueue.length]);

  const prev = useCallback(() => {
    setSessionDone(false);
    setIndex((i) => Math.max(0, i - 1));
    setRevealed(false);
  }, []);

  const rateCard = useCallback((rating: Rating) => {
    if (!card) return;
    const id = cardId(card);
    const xpByRating = { again: 5, hard: 8, good: 10, easy: 12 };
    let tomorrowCount = 0;

    setStore((prevStore) => {
      const prevDeckReviews = prevStore.reviews[deckKey] || {};
      const nextDeckReviews = {
        ...prevDeckReviews,
        [id]: scheduleReview(prevDeckReviews[id], rating),
      };
      tomorrowCount = countTomorrowReviews(nextDeckReviews);
      const deckKnown = { ...(prevStore.known[deckKey] || {}), [id]: rating === 'good' || rating === 'easy' };

      return {
        ...prevStore,
        known: { ...prevStore.known, [deckKey]: deckKnown },
        reviews: { ...prevStore.reviews, [deckKey]: nextDeckReviews },
        activity: updateActivity(prevStore.activity),
      };
    });
    setSessionStats((stats) => ({
      reviewed: stats.reviewed + 1,
      xp: stats.xp + xpByRating[rating],
      tomorrow: tomorrowCount,
    }));
    if (index + 1 >= dailyQueue.length) {
      setSessionDone(true);
    } else {
      setIndex((i) => i + 1);
    }
    setRevealed(false);
  }, [card, dailyQueue.length, deckKey, index, setStore]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (!card || mode !== 'cards' || target?.closest('input, textarea, button')) return;
      if (event.code === 'Space') {
        event.preventDefault();
        setRevealed((value) => !value);
      }
      if (event.key === '1') rateCard('again');
      if (event.key === '2') rateCard('hard');
      if (event.key === '3') rateCard('good');
      if (event.key === '4') rateCard('easy');
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [card, mode, rateCard]);

  const restartSession = useCallback(() => {
    const plannedQueue = getDailyQueue(allCards, reviewMap);
    setIndex(0);
    setSessionDone(false);
    setRevealed(false);
    setSessionQueueIds(plannedQueue.map(cardId));
    setQueuePlan({
      new: plannedQueue.filter((item) => !reviewMap[cardId(item)]).length,
      review: plannedQueue.filter((item) => !!reviewMap[cardId(item)]).length,
    });
    setSessionStats((stats) => ({
      ...stats,
      tomorrow: countTomorrowReviews(reviewMap),
    }));
  }, [allCards, reviewMap]);

  const addCustomCard = (payload: CardRecord) => {
    if (allCards.some((item) => normalizeFront(item.front) === normalizeFront(payload.front))) {
      return { ok: false, message: "Bu so'z allaqachon bor." };
    }
    const now = Date.now();
    setStore((prevStore) => ({
      ...prevStore,
      custom: {
        ...prevStore.custom,
        [deckKey]: [
          ...(prevStore.custom[deckKey] || []),
          { ...payload, id: `custom-${now}`, source: 'custom', createdAt: now },
        ],
      },
    }));
    setMode("cards");
    setIndex(0);
    setRevealed(false);
    return { ok: true, message: "Karta saqlandi." };
  };

  const updateCustomCard = (id: string, payload: CardRecord) => {
    const duplicate = allCards.some((item) => cardId(item) !== id && normalizeFront(item.front) === normalizeFront(payload.front));
    if (duplicate) return { ok: false, message: "Bu so'z boshqa kartada bor." };
    let updated = false;
    setStore((prevStore) => ({
      ...prevStore,
      custom: {
        ...prevStore.custom,
        [deckKey]: (prevStore.custom[deckKey] || []).map((cardItem) => {
          if (!customMatch(cardItem, id)) return cardItem;
          updated = true;
          return { ...cardItem, ...payload, id: cardItem.id || id, source: 'custom', updatedAt: Date.now() };
        }),
      },
    }));
    return { ok: updated, message: updated ? "Karta yangilandi." : "Bu karta tahrirlanmaydi." };
  };

  const deleteCustomCard = (id: string) => {
    setStore((prevStore) => ({
      ...prevStore,
      custom: {
        ...prevStore.custom,
        [deckKey]: (prevStore.custom[deckKey] || []).filter((cardItem) => !customMatch(cardItem, id)),
      },
      reviews: {
        ...prevStore.reviews,
        [deckKey]: Object.fromEntries(Object.entries(prevStore.reviews[deckKey] || {}).filter(([reviewId]) => reviewId !== id)),
      },
      known: {
        ...prevStore.known,
        [deckKey]: Object.fromEntries(Object.entries(prevStore.known[deckKey] || {}).filter(([knownId]) => knownId !== id)),
      },
    }));
    return { ok: true, message: "Karta o'chirildi." };
  };

  const exportBackup = () => {
    if (typeof window === 'undefined') return;
    const payload = {
      app: 'kartacha',
      version: 1,
      exportedAt: new Date().toISOString(),
      store,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `kartacha-backup-${todayKey()}.json`;
    link.click();
    URL.revokeObjectURL(url);
    setBackupNotice("Backup fayl yuklab olindi.");
  };

  const importBackup = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result || '{}'));
        const importedStore = parsed.store || parsed;
        if (!importedStore || typeof importedStore !== 'object' || !importedStore.custom || !importedStore.reviews) {
          setBackupNotice("Backup fayl formati noto'g'ri.");
          return;
        }
        const nextStore: Store = {
          deckKey: importedStore.deckKey || 'en',
          dark: Boolean(importedStore.dark),
          known: importedStore.known || {},
          custom: { en: [], ko: [], ...(importedStore.custom || {}) },
          reviews: importedStore.reviews || {},
          activity: { ...defaultActivity(), ...(importedStore.activity || {}) },
        };
        setStore(nextStore);
        setMode('cards');
        setIndex(0);
        setRevealed(false);
        setSessionDone(false);
        setBackupNotice("Backup import qilindi.");
      } catch (error) {
        setBackupNotice("Backup faylni o'qib bo'lmadi.");
      }
    };
    reader.readAsText(file);
  };

  const summaryStats = {
    ...sessionStats,
    tomorrow: sessionStats.reviewed ? sessionStats.tomorrow : countTomorrowReviews(reviewMap),
  };
  const hardWords = useMemo(() => getHardWords(allCards, reviewMap), [allCards, reviewMap]);
  const activity = { ...defaultActivity(), ...(store.activity || {}) };

  const setDeck = (k: string) => setStore({ deckKey: k });
  const setDark = (d: boolean) => setStore({ dark: d });
  const userLabel = session?.user?.name || session?.user?.email || 'Profil';
  const shouldShowAuth = authConfig === null || (googleReady && status === 'unauthenticated' && !demoMode);

  if (authConfig === null || status === 'loading') {
    return (
      <div className="fc-app v-modern">
        <div className="fc-soft-message auth-loading">Yuklanmoqda...</div>
      </div>
    );
  }

  if (shouldShowAuth) {
    return <AuthScreen googleReady={googleReady} onDemo={() => setDemoMode(true)} />;
  }

  return (
    <div className={`fc-app v-modern ${deckKey} ${dark ? "dark" : ""}`}>
      <div className="fc-top">
        <div className="fc-brand">
          <span className="fc-brand-mark">Karta·cha</span>
          <span className="fc-brand-sub">{label}</span>
        </div>
        <div className="fc-decks" role="tablist">
          {Object.entries(DECKS).map(([k, d]) => (
            <button
              key={k}
              className={`fc-deck ${deckKey === k ? "active" : ""}`}
              onClick={() => setDeck(k)}
              role="tab"
            >
              <span>{d.name}</span>
              <small>{deckBadges[k] || 0}</small>
            </button>
          ))}
        </div>
        <AccountMenu
          userLabel={userLabel}
          demoMode={demoMode || !googleReady}
          activity={activity}
          onExport={exportBackup}
          onImport={importBackup}
        />
        <button className="fc-icon-btn" onClick={() => setDark(!dark)} aria-label="rejimni almashtirish">
          {dark ? <IconSun/> : <IconMoon/>}
        </button>
      </div>

      <div className="fc-modes">
        {["cards", "quiz", "add"].map((m) => (
          <button
            key={m}
            className={`fc-mode ${mode === m ? "active" : ""}`}
            onClick={() => { setMode(m); setRevealed(false); }}
          >
            {m === "cards" ? "Bugungi mashq" : m === "quiz" ? "Tez test" : "Kartalar"}
          </button>
        ))}
        <div className="fc-mode-spacer"/>
        <div className="fc-progress-wrap" aria-label="Progress statistikasi">
          <div className="fc-progress-stat">
            <span>Esda</span>
            <strong>{retentionPercent}%</strong>
          </div>
          <div className="fc-progress-stat">
            <span>Ko&apos;rilgan</span>
            <strong>{reviewedCount}</strong>
          </div>
          <div className="fc-progress-stat">
            <span>Bugun</span>
            <strong>{dueCount}</strong>
          </div>
          <div className="fc-progress-stat">
            <span>Jami</span>
            <strong>{allCards.length}</strong>
          </div>
          <div className="fc-progress-stat">
            <span>Streak</span>
            <strong>{activity.streak || 0}</strong>
          </div>
        </div>
      </div>

      <div className="fc-body">
        {backupNotice && (
          <div className="fc-toast fc-global-toast" role="status">{backupNotice}</div>
        )}
        {mode === "cards" && (
          <div className="fc-queue-meta">
            <span>Bugungi limit: {queuePlan.new} yangi / {queuePlan.review} review</span>
            <span>{dailyQueue.length} karta queue&apos;da</span>
          </div>
        )}
        {mode === "cards" && (
          <HardWordsPanel words={hardWords}/>
        )}
        {mode === "cards" && (
          <CardsMode
            card={card}
            revealed={revealed}
            setRevealed={setRevealed}
            rateCard={rateCard}
            next={next}
            prev={prev}
            index={index}
            total={dailyQueue.length}
            catNum={1 + index}
            deckCode={deckCode}
            deckKey={deckKey}
            hasCards={allCards.length > 0}
            sessionStats={summaryStats}
            onAddCard={() => {
              setMode("add");
              setRevealed(false);
            }}
            onRestart={restartSession}
          />
        )}
        {mode === "quiz" && (
          <QuizMode deckKey={deckKey} cards={allCards}/>
        )}
        {mode === "add" && (
          <AddMode
            deckKey={deckKey}
            deckName={deckName}
            cards={allCards}
            reviewMap={reviewMap}
            knownSet={knownSet}
            onAdd={addCustomCard}
            onUpdate={updateCustomCard}
            onDelete={deleteCustomCard}
          />
        )}
      </div>

      <div className="fc-foot">
        <span>{deckCode}</span><span className="dot"/>
        <span>{allCards.length} ta so&apos;z</span><span className="dot"/>
        {mode === "cards" && (<><span>Bugungi karta {currentCardLabel}</span><span className="dot"/></>)}
        <span>{demoMode || !googleReady ? "Demo saqlov" : "Profilga bog'langan"}</span>
        <span className="spacer"/>
        <span>Kartani bosib javobni oching</span>
      </div>
    </div>
  );
}
