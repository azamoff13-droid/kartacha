ALTER TABLE "Deck" ADD COLUMN "key" TEXT;
ALTER TABLE "Card" ADD COLUMN "pos" TEXT;

CREATE TABLE "StudyEvent" (
  "id" TEXT NOT NULL,
  "clientEventId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "cardId" TEXT NOT NULL,
  "deckKey" TEXT NOT NULL,
  "rating" "ReviewRating" NOT NULL,
  "shownAt" TIMESTAMP(3) NOT NULL,
  "revealedAt" TIMESTAMP(3),
  "ratedAt" TIMESTAMP(3) NOT NULL,
  "activeMs" INTEGER NOT NULL,
  "recallMs" INTEGER,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "StudyEvent_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Deck_userId_key_key" ON "Deck"("userId", "key");
CREATE UNIQUE INDEX "StudyEvent_clientEventId_key" ON "StudyEvent"("clientEventId");
CREATE INDEX "StudyEvent_userId_createdAt_idx" ON "StudyEvent"("userId", "createdAt");
CREATE INDEX "StudyEvent_userId_cardId_idx" ON "StudyEvent"("userId", "cardId");

ALTER TABLE "StudyEvent" ADD CONSTRAINT "StudyEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StudyEvent" ADD CONSTRAINT "StudyEvent_cardId_fkey" FOREIGN KEY ("cardId") REFERENCES "Card"("id") ON DELETE CASCADE ON UPDATE CASCADE;
