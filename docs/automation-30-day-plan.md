# Karta.cha 30-Day 1% Automation Plan

Use this document as the source prompt for the recurring "Karta.cha 30 kunlik 1% yaxshilash" automation.

The plan replaces the older localStorage-first flashcard roadmap with the current product direction:

- English and Korean vocabulary learning for young learners in Uzbekistan.
- Account-first app using Supabase.
- Student-first MVP; teacher dashboard is intentionally deferred.
- Guided study sessions instead of free-form card flipping.
- Progress based on active study time, recall quality, and due words.
- Simple interval scheduler with `again`, `hard`, `good`, and `easy`.
- 100 English and 100 Korean starter cards.
- Lightweight browser TTS if it stays simple.
- `main` must stay stable; every meaningful change happens on a branch and is checked before merge.

## Automation Command

Paste this into the automation instructions:

```text
Automation: Karta.cha 30 kunlik 1% yaxshilash

Karta.cha uchun yangi product yo'nalishga mos 30 kunlik 1% yaxshilash rejasini bajaring.

Har bir ishga tushishda:
- main branchga bevosita commit qilmang;
- bugungi reja bosqichini aniqlang;
- day-XX-short-name formatida alohida branch yarating yoki mavjud mos branch bo'lsa uni davom ettiring;
- agar oldingi branch hali merge bo'lmagan bo'lsa, mainni buzmasdan o'sha branch holatini hisobga oling;
- kichik, xavfsiz, yakunlanadigan 1% yaxshilashni implement qiling;
- product qarorlariga amal qiling: English + Korean, account-first, Supabase, guided session, active timer, review scheduler, progress clarity;
- secrets yoki Supabase service-role keylarini commit qilmang;
- har o'zgarishda docs/engineering-workflow.md qoidalariga amal qiling;
- npm run lint va npm run build ishga tushiring;
- UI/flow o'zgarsa qisqa manual QA yozing;
- branchni GitHubga push qiling;
- main'ga merge qilishdan oldin foydalanuvchi tasdig'i kerakligini eslating;
- yakunda branch, commit, nimalar o'zgardi, test natijasi, manual QA, keyingi tavsiya haqida qisqa hisobot bering.

MVP product qarorlari:
- Karta.cha O'zbekistondagi ingliz va koreys tili o'rganuvchi yoshlar uchun.
- Asosiy maqsad: so'zlarni ko'r-ko'rona yodlash emas, faol mashq vaqti, eslab qolish sifati va qaytadigan so'zlar orqali unutmasdan yodlash.
- Birinchi real versiya account bilan ishlaydi.
- Supabase auth va database tavsiya qilingan stack.
- Teacher dashboard hozircha shart emas, lekin schema kelajakda teacher reportingga tayyor bo'lsin.
- Onboarding minimal: til tanlash va kunlik reja tanlash.
- Kunlik reja variantlari: 10 daqiqa, 20 so'z, erkin mashq.
- Timer faqat active study time hisoblasin; uzun harakatsizlik vaqtni oshirmasin.
- Guided session oqimi: til/reja tanlash, bugungi queue, karta, javobni ko'rish, again/hard/good/easy, session summary.
- Progress: bugun + 7 kun; active minutes, reviewed words, good/easy, again/hard, tomorrow due.
- Scheduler oddiy interval bilan boshlanadi: again = bugun yana yoki 5 daqiqadan keyin, hard = ertaga, good = 3 kun, easy = 7 kun.
- Quiz asosiy flow emas; review session birinchi o'rinda.
- Kontent: 100 English starter + 100 Korean starter karta.
- Browser speechSynthesis orqali oddiy TTS qo'shish mumkin, agar murakkab bo'lmasa.
- Monetizatsiya va kurs CTA birinchi MVPda yo'q.

30 kunlik yangi reja:
Day 1 Product spec: kelishilgan product qarorlarini docs/product-spec.mdga yoz, scope va non-goalsni aniqlashtir.
Day 2 Safe workflow: docs/engineering-workflow.md va docs/qa-checklist.mdni product qarorlariga mos yangila.
Day 3 Supabase plan: schema draft, RLS qoidalari, env var ro'yxati, migration tartibini hujjatlashtir.
Day 4 Auth scaffold: Supabase client/env namunasi, login/register UI skeleti, secrets commit qilinmasin.
Day 5 Auth UX: register/login validation, loading, error copy Uzbekcha yumshoq bo'lsin.
Day 6 Profile model: profiles uchun selected language va daily goal modelini tayyorla.
Day 7 Weekly review: auth/onboarding xavflarini tekshir, lint/build, docs va branch holatini tartibla.
Day 8 Onboarding: registerdan keyin til tanlash ekranini qo'sh.
Day 9 Goal picker: 10 daqiqa, 20 so'z, erkin mashq tanlovini qo'sh.
Day 10 Dashboard CTA: asosiy ekran markazida Mashqni boshlash bo'lsin.
Day 11 Session shell: guided session boshlash, davom ettirish va tugatish skeletini qo'sh.
Day 12 Active timer: active study time hisoblash, harakatsizlik pauza qoidasi.
Day 13 Review buttons: again/hard/good/easy UI va Uzbek copy.
Day 14 Weekly review: onboardingdan sessiongacha mobile/desktop QA.
Day 15 Scheduler module: simple interval schedulerni src/lib/scheduler.ts kabi alohida modulga ajrat.
Day 16 Review state: user-card review_state modelini va local fallback/test data bilan bog'la.
Day 17 Review logs: har javob uchun rating, timestamp, active time loglash.
Day 18 Daily queue: yangi + due kartalarni limit bilan chiqarish.
Day 19 Session summary: active minutes, reviewed, good/easy, again/hard, tomorrow due ko'rsatish.
Day 20 Seven-day progress: bugun + 7 kunlik progress mini chart/list.
Day 21 Weekly review: scheduler/session/progress flow sinovi va regression checklist.
Day 22 Content model: deck/card schema'ni language, level, topic, source, estimatedMinutes bilan kengaytir.
Day 23 English starter: English starter kontentni 100 kartaga olib borish uchun seed format va birinchi batch.
Day 24 Korean starter: Korean starter kontentni 100 kartaga olib borish uchun seed format va birinchi batch.
Day 25 Custom cards: user custom karta qo'shish account-aware bo'lsin.
Day 26 Search/edit/delete slice: custom kartalar uchun minimal boshqaruv UX.
Day 27 TTS slice: speechSynthesis bilan English/Korean talaffuz tugmasi.
Day 28 Weekly review: mobile, account, session, content, TTS QA.
Day 29 Docs polish: README, API/data model, Supabase setup, safe git workflow, reset/test bo'limlarini tartibla.
Day 30 Release readiness: final lint/build/manual QA, merge uchun tayyor branch holati, lekin main'ga merge qilishdan oldin foydalanuvchi tasdig'ini kut.
```

## Branch Naming

Recommended branch names:

- `day-01-product-spec`
- `day-02-safe-workflow`
- `day-03-supabase-plan`
- `day-04-auth-scaffold`
- `day-05-auth-ux`
- `day-08-onboarding-language`
- `day-11-session-shell`
- `day-15-scheduler-module`
- `day-20-seven-day-progress`
- `day-27-tts-slice`
- `day-30-release-readiness`

## Notes For Future Runs

- If Supabase credentials are not available, do not fake production integration. Build typed interfaces, env validation, docs, and local-safe placeholders instead.
- If a feature risks breaking `main`, keep it behind a branch and report what is still missing.
- Teacher dashboard is deliberately out of MVP scope. Do not spend automation days on it until the student learning loop is reliable.
- Prefer small shippable slices over large rewrites.
