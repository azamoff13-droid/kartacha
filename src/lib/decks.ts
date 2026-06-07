export interface Card {
  front: string;
  pos: string;
  translation: string;
  example?: string;
}

export interface Deck {
  name: string;
  code: string;
  cards: Card[];
}

export const DECKS: Record<string, Deck> = {
  en: {
    name: "Ingliz tili",
    code: "EN",
    cards: [
      { front: "abundant",   pos: "adj.",  translation: "mo'l, serob",          example: "The garden has abundant flowers in spring." },
      { front: "fragile",    pos: "adj.",  translation: "mo'rt, sinuvchan",     example: "Handle the glass — it is very fragile." },
      { front: "linger",     pos: "verb",  translation: "ushlanib qolmoq",      example: "She lingered by the door, hesitating to leave." },
      { front: "quaint",     pos: "adj.",  translation: "g'aroyib, qadimiy",    example: "We stayed in a quaint little village." },
      { front: "resilient",  pos: "adj.",  translation: "chidamli, bardoshli",  example: "Children are remarkably resilient." },
      { front: "mundane",    pos: "adj.",  translation: "kundalik, oddiy",      example: "He longed to escape his mundane routine." },
      { front: "eloquent",   pos: "adj.",  translation: "chechan, ravon",       example: "Her eloquent speech moved the audience." },
      { front: "profound",   pos: "adj.",  translation: "chuqur, ta'sirli",     example: "The book had a profound effect on me." },
      { front: "nostalgic",  pos: "adj.",  translation: "sog'inchli",           example: "Old songs make me feel nostalgic." },
      { front: "ambiguous",  pos: "adj.",  translation: "noaniq, ikki ma'noli", example: "The instructions were ambiguous." },
      { front: "diligent",   pos: "adj.",  translation: "tirishqoq, mehnatkash",example: "She is a diligent student." },
      { front: "vivid",      pos: "adj.",  translation: "yorqin, jonli",        example: "He had a vivid dream last night." },
    ],
  },
  ko: {
    name: "Koreys tili",
    code: "KO",
    cards: [
      { front: "안녕하세요", pos: "ibora",   translation: "Salom (rasmiy)",     example: "안녕하세요, 만나서 반갑습니다." },
      { front: "감사합니다", pos: "ibora",   translation: "Rahmat (rasmiy)",    example: "도와주셔서 정말 감사합니다." },
      { front: "사랑",       pos: "ot",      translation: "sevgi",               example: "그녀에 대한 사랑이 깊다." },
      { front: "친구",       pos: "ot",      translation: "do'st",               example: "그는 나의 가장 좋은 친구이다." },
      { front: "책",         pos: "ot",      translation: "kitob",               example: "나는 매일 책을 읽는다." },
      { front: "학교",       pos: "ot",      translation: "maktab",              example: "학교는 8시에 시작한다." },
      { front: "음식",       pos: "ot",      translation: "taom, ovqat",         example: "한국 음식은 정말 맛있다." },
      { front: "시간",       pos: "ot",      translation: "vaqt",                example: "시간이 너무 빨리 지나간다." },
      { front: "행복",       pos: "ot",      translation: "baxt",                example: "가족과 함께라서 행복하다." },
      { front: "사과",       pos: "ot",      translation: "olma",                example: "빨간 사과를 먹었다." },
      { front: "비",         pos: "ot",      translation: "yomg'ir",             example: "오늘 비가 많이 온다." },
      { front: "꿈",         pos: "ot",      translation: "orzu, tush",          example: "꿈을 향해 노력한다." },
    ],
  },
};
