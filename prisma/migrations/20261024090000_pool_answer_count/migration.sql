-- Kreuz-Kontingent zählt beantwortete statt ausgelieferte Fragen (rein additiv).
ALTER TABLE "GeneratorDailyUsage" ADD COLUMN "poolAnswerCount" INTEGER NOT NULL DEFAULT 0;
