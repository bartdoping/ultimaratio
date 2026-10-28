-- Altlast: In Production fehlte der Fremdschlüssel Subscription.userId → User.id.
-- Beim Löschen eines Kontos blieb die Abo-Zeile deshalb liegen (verwaist), und
-- Stripe-Webhooks zu diesem Abo scheiterten. Idempotent: Dev hat ihn bereits.
-- Voraussetzung: keine verwaisten Zeilen (vorher unter /admin/stripe bereinigt);
-- sonst schlägt die Migration bewusst fehl, statt Daten still zu löschen.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = '"Subscription"'::regclass AND conname = 'Subscription_userId_fkey'
  ) THEN
    ALTER TABLE "Subscription"
      ADD CONSTRAINT "Subscription_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
