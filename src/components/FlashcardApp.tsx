'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { DECKS } from '@/src/lib/decks';
import '@/src/styles/flashcards.css';

const LS_KEY = 'fc-app-v1';
const EVT = 'fc-app-sync';

interface Store {
  deckKey: string;
  dark: boolean;
  known: Record<string, Record<string, boolean>>;
  custom: Record<string, any[]>;
}

function loadStore(): Store {
  try {
    if (typeof window !== 'undefined') {
      const raw = localStorage.getItem(LS_KEY);
      if (raw) return JSON.parse(raw);
    }
  } catch (e) {}
  return { deckKey: 'en', dark: false, known: {}, custom: { en: [], ko: [] } };
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

function shuffle(arr: any[]) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function CardsMode({ card, revealed, setRevealed, markKnown, next, prev, index, total, catNum, deckCode, isKnown }: any) {
  if (!card) return <div style={{textAlign:"center",opacity:0.6}}>Hozircha karta yo&apos;q. &quot;Yangi karta&quot; bo&apos;limidan birinchi so&apos;zingizni qo&apos;shing.</div>;
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
        <button className="fc-btn dunno" onClick={() => markKnown(false)}>
          <IconX/> Bilmayman
        </button>
        <button className="fc-btn know" onClick={() => markKnown(true)}>
          <IconCheck/> Esda qoldi
        </button>
        <button className="fc-btn" onClick={next}>Keyingisi →</button>
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
      <div style={{display:"flex", gap:10, justifyContent:"flex-end", marginTop:4}}>
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

export function FlashcardApp({ label = "Karta·cha" }: { label?: string }) {
  const [store, setStore] = useStore();
  const { deckKey, dark, known, custom } = store;

  const baseCards = DECKS[deckKey]?.cards || [];
  const customCards = custom[deckKey] || [];
  const allCards = useMemo(() => [...baseCards, ...customCards], [baseCards, customCards]);
  const deckName = DECKS[deckKey]?.name || '';
  const deckCode = DECKS[deckKey]?.code || '';

  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [mode, setMode] = useState('cards');

  useEffect(() => {
    setIndex((i) => (i >= allCards.length ? 0 : i));
    setRevealed(false);
  }, [deckKey, allCards.length]);

  const card = allCards[index];
  const knownSet = known[deckKey] || {};
  const knownCount = Object.keys(knownSet).filter((k) => knownSet[k]).length;
  const progress = allCards.length ? knownCount / allCards.length : 0;
  const currentCardLabel = allCards.length ? `${index + 1}/${allCards.length}` : "0/0";

  const next = useCallback(() => {
    setIndex((i) => (i + 1) % allCards.length);
    setRevealed(false);
  }, [allCards.length]);

  const prev = useCallback(() => {
    setIndex((i) => (i - 1 + allCards.length) % allCards.length);
    setRevealed(false);
  }, [allCards.length]);

  const markKnown = useCallback((isKnown: boolean) => {
    setStore((prev) => {
      const dk = { ...(prev.known[deckKey] || {}), [cardId(card)]: isKnown };
      return { ...prev, known: { ...prev.known, [deckKey]: dk } };
    });
    setTimeout(next, 120);
  }, [card, deckKey, next, setStore]);

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
        <div className="fc-progress-wrap">
          <span>Esda qolgan</span>
          <div className="fc-progress-track">
            <div className="fc-progress-fill" style={{ width: `${progress * 100}%` }}/>
          </div>
          <span>{knownCount}/{allCards.length}</span>
        </div>
      </div>

      <div className="fc-body">
        {mode === "cards" && (
          <CardsMode
            card={card}
            revealed={revealed}
            setRevealed={setRevealed}
            markKnown={markKnown}
            next={next}
            prev={prev}
            index={index}
            total={allCards.length}
            catNum={1 + index}
            deckCode={deckCode}
            isKnown={!!knownSet[cardId(card)]}
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
