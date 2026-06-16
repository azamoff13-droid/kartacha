'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { DECKS } from '@/src/lib/decks';
import '@/src/styles/flashcards.css';

const LS_KEY = 'fc-app-v1';
const EVT = 'fc-app-sync';
const DAILY_NEW_LIMIT = 5;
const DAILY_REVIEW_LIMIT = 15;

type Rating = 'again' | 'hard' | 'good' | 'easy';

interface ReviewState {
  rating: Rating;
  dueAt: number;
  intervalDays: number;
  reps: number;
  lapses: number;
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

interface Store {
  deckKey: string;
  dark: boolean;
  known: Record<string, Record<string, boolean>>;
  custom: Record<string, any[]>;
  reviews: Record<string, Record<string, ReviewState>>;
}

function loadStore(): Store {
  const fallback: Store = { deckKey: 'en', dark: false, known: {}, custom: { en: [], ko: [] }, reviews: {} };
  try {
    if (typeof window !== 'undefined') {
      const raw = localStorage.getItem(LS_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        return {
          ...fallback,
          ...parsed,
          known: parsed.known || {},
          custom: parsed.custom || fallback.custom,
          reviews: parsed.reviews || {},
        };
      }
    }
  } catch (e) {}
  return fallback;
}

function saveStore(s: Store) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(s));
  } catch (e) {}
  window.dispatchEvent(new CustomEvent(EVT, { detail: s }));
}

function useStore() {
  const [store, setStore] = useState<Store>(loadStore);

  useEffect(() => {
    const onSync = (e: any) => setStore(e.detail);
    window.addEventListener(EVT, onSync);
    return () => window.removeEventListener(EVT, onSync);
  }, []);

  const update = useCallback((patch: Partial<Store> | ((prev: Store) => Store)) => {
    setStore((prev) => {
      const next = typeof patch === 'function' ? patch(prev) : { ...prev, ...patch };
      saveStore(next);
      return next;
    });
  }, []);

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

function cardId(c: any) { return c.front; }

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

function getDailyQueue(cards: any[], reviewMap: Record<string, ReviewState>) {
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

function getHardWords(cards: any[], reviewMap: Record<string, ReviewState>): HardWord[] {
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

function shuffle(arr: any[]) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function CardsMode({ card, revealed, setRevealed, rateCard, next, prev, catNum, deckCode, hasCards, sessionStats, onAddCard, onRestart }: any) {
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
      <div className="fc-card-stage">
        <div
          className={`fc-card ${revealed ? "revealed" : ""}`}
          onClick={() => setRevealed((r: boolean) => !r)}
          data-num={String(catNum).padStart(4, "0")}
        >
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
        <button className="fc-btn" onClick={next}>Keyingisi →</button>
      </div>
      <div className="fc-rating-actions">
        <button className="fc-btn dunno" onClick={() => rateCard('again')}>
          <IconX/> Yana
        </button>
        <button className="fc-btn hard" onClick={() => rateCard('hard')}>
          Qiyin
        </button>
        <button className="fc-btn know" onClick={() => rateCard('good')}>
          <IconCheck/> Yaxshi
        </button>
        <button className="fc-btn easy" onClick={() => rateCard('easy')}>
          Oson
        </button>
      </div>
    </>
  );
}

function QuizMode({ deckKey, cards }: any) {
  const buildRound = (pool: any[]) => {
    if (pool.length < 4) return null;
    const ordered = shuffle(pool);
    return ordered.slice(0, Math.min(10, ordered.length)).map((c: any) => {
      const distractors = shuffle(pool.filter((x: any) => x.front !== c.front)).slice(0, 3);
      return { card: c, options: shuffle([c, ...distractors]) };
    });
  };

  const [round, setRound] = useState(() => buildRound(cards));
  const [qIdx, setQIdx] = useState(0);
  const [picked, setPicked] = useState<any>(null);
  const [score, setScore] = useState({ right: 0, wrong: 0 });

  useEffect(() => {
    setRound(buildRound(cards));
    setQIdx(0); setPicked(null); setScore({right:0,wrong:0});
  }, [deckKey, cards.length]);

  if (!round) {
    return <div style={{textAlign:"center",opacity:0.7,maxWidth:420,margin:"auto"}}>
      Tez test uchun kamida 4 ta karta kerak. Yana bir nechta so&apos;z qo&apos;shing.
    </div>;
  }

  const cur = round[qIdx];
  if (!cur) {
    return (
      <div style={{textAlign:"center", maxWidth:420, margin:"auto", display:"flex", flexDirection:"column", gap:14}}>
        <div className="fc-quiz-q">Bugungi test natijasi</div>
        <div className="fc-quiz-word">{score.right}/{score.right + score.wrong}</div>
        <button className="fc-btn primary" style={{alignSelf:"center"}}
          onClick={() => { setRound(buildRound(cards)); setQIdx(0); setPicked(null); setScore({right:0,wrong:0}); }}>
          Yana bir marta ishlash <IconArrow/>
        </button>
      </div>
    );
  }

  const onPick = (opt: any) => {
    if (picked) return;
    setPicked(opt);
    const correct = opt.front === cur.card.front;
    setScore((s: any) => ({ right: s.right + (correct?1:0), wrong: s.wrong + (correct?0:1) }));
    setTimeout(() => { setQIdx((i: number) => i + 1); setPicked(null); }, 900);
  };

  return (
    <div style={{width:"100%"}}>
      <div className="fc-quiz-q">{qIdx + 1}/{round.length} · To&apos;g&apos;ri tarjimani tanlang</div>
      <h2 className="fc-quiz-word">{cur.card.front}</h2>
      <div className="fc-quiz-opts">
        {cur.options.map((opt: any, i: number) => {
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

function AddMode({ deckKey, deckName, onAdd }: any) {
  const [front, setFront] = useState("");
  const [translation, setTranslation] = useState("");
  const [pos, setPos] = useState("");
  const [example, setExample] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const valid = front.trim() && translation.trim();

  const saveCard = () => {
    if (!valid || isSaving) return;
    setIsSaving(true);
    window.setTimeout(() => {
      onAdd({ front: front.trim(), translation: translation.trim(), pos: pos.trim() || "—", example: example.trim() });
      setIsSaving(false);
    }, 180);
  };

  return (
    <div className="fc-form">
      <div style={{textAlign:"center", marginBottom: 4}}>
        <div className="fc-pos" style={{marginBottom: 6}}>Yangi karta</div>
        <h3 className="serif" style={{margin:0, fontSize:24, fontWeight:500}}>{deckName}</h3>
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
        So&apos;z va tarjima yozilsa, karta darhol shu kolodaga qo&apos;shiladi.
      </p>
      <div className="fc-form-actions">
        <button className="fc-btn" disabled={isSaving} onClick={() => { setFront(""); setTranslation(""); setPos(""); setExample(""); }}>Tozalash</button>
        <button
          className="fc-btn primary"
          disabled={!valid || isSaving}
          style={{opacity: valid && !isSaving ? 1 : 0.5}}
          onClick={saveCard}>
          {isSaving ? "Saqlanmoqda..." : "Kartani saqlash"} {!isSaving && <IconArrow/>}
        </button>
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
  const [store, setStore] = useStore();
  const { deckKey, dark, known, custom, reviews } = store;

  const baseCards = useMemo(() => DECKS[deckKey]?.cards || [], [deckKey]);
  const customCards = useMemo(() => custom[deckKey] || [], [custom, deckKey]);
  const allCards = useMemo(() => [...baseCards, ...customCards], [baseCards, customCards]);
  const deckName = DECKS[deckKey]?.name || '';
  const deckCode = DECKS[deckKey]?.code || '';
  const reviewMap = useMemo(() => reviews[deckKey] || {}, [reviews, deckKey]);

  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [mode, setMode] = useState('cards');
  const [sessionDone, setSessionDone] = useState(false);
  const [sessionStats, setSessionStats] = useState<SessionStats>({ reviewed: 0, xp: 0, tomorrow: 0 });
  const [sessionQueueIds, setSessionQueueIds] = useState<string[]>([]);
  const [queuePlan, setQueuePlan] = useState<QueuePlan>({ new: 0, review: 0 });

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
    return sessionQueueIds.map((id) => cardsById.get(id)).filter(Boolean);
  }, [allCards, sessionQueueIds]);
  const card = sessionDone ? null : dailyQueue[index];
  const knownSet = known[deckKey] || {};
  const knownCount = Object.keys(knownSet).filter((k) => knownSet[k]).length;
  const progress = allCards.length ? knownCount / allCards.length : 0;
  const retentionPercent = Math.round(progress * 100);
  const reviewedCount = Object.keys(reviewMap).length;
  const dueCount = Object.values(reviewMap).filter((review) => review.dueAt <= Date.now()).length;
  const currentCardLabel = dailyQueue.length && card ? `${index + 1}/${dailyQueue.length}` : "0/0";

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

    setStore((prev) => {
      const prevDeckReviews = prev.reviews[deckKey] || {};
      const nextDeckReviews = {
        ...prevDeckReviews,
        [id]: scheduleReview(prevDeckReviews[id], rating),
      };
      tomorrowCount = countTomorrowReviews(nextDeckReviews);
      const deckKnown = { ...(prev.known[deckKey] || {}), [id]: rating === 'good' || rating === 'easy' };

      return {
        ...prev,
        known: { ...prev.known, [deckKey]: deckKnown },
        reviews: { ...prev.reviews, [deckKey]: nextDeckReviews },
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
  const summaryStats = {
    ...sessionStats,
    tomorrow: sessionStats.reviewed ? sessionStats.tomorrow : countTomorrowReviews(reviewMap),
  };
  const hardWords = useMemo(() => getHardWords(allCards, reviewMap), [allCards, reviewMap]);

  const setDeck = (k: string) => setStore({ deckKey: k });
  const setDark = (d: boolean) => setStore({ dark: d });

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
            >{d.name}</button>
          ))}
        </div>
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
            {m === "cards" ? "Bugungi mashq" : m === "quiz" ? "Tez test" : "Yangi karta"}
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
        </div>
      </div>

      <div className="fc-body">
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
            onAdd={(c: any) => {
              setStore((prev) => ({
                ...prev,
                custom: { ...prev.custom, [deckKey]: [...(prev.custom[deckKey] || []), c] },
              }));
              setMode("cards");
              setIndex(baseCards.length + customCards.length);
              setRevealed(false);
            }}
          />
        )}
      </div>

      <div className="fc-foot">
        <span>{deckCode}</span><span className="dot"/>
        <span>{allCards.length} ta so&apos;z</span><span className="dot"/>
        {mode === "cards" && (<><span>Bugungi karta {currentCardLabel}</span><span className="dot"/></>)}
        <span>Qurilmada saqlanadi</span>
        <span className="spacer"/>
        <span>Kartani bosib javobni oching</span>
      </div>
    </div>
  );
}
