-- Öffentliche Prüfungsübersicht /exams: einzelne Prüfungen ausblenden, ohne Inhalte zu löschen.
ALTER TABLE "Exam" ADD COLUMN "visibleOnExamsPage" BOOLEAN NOT NULL DEFAULT true;
