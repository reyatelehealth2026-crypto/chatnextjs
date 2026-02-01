-- Add satisfaction rating fields to Conversation
ALTER TABLE "Conversation"
  ADD COLUMN "satisfactionRating" INTEGER,
  ADD COLUMN "satisfactionRatedAt" TIMESTAMP(3),
  ADD COLUMN "satisfactionRequestedAt" TIMESTAMP(3);

CREATE INDEX "Conversation_satisfactionRating_idx" ON "Conversation"("satisfactionRating");