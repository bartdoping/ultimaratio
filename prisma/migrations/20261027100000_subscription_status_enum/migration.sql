-- Altlast: In Production wurden "User"."subscriptionStatus" und
-- "Subscription"."status" einst als TEXT angelegt, das Schema erwartet das
-- Enum "SubscriptionStatus". Lesen/Schreiben ging trotzdem, Filter wie
-- WHERE "subscriptionStatus" = 'pro' scheiterten (text = enum).
-- Verlustfreie Umwandlung per USING-Cast; idempotent (Dev hat bereits das Enum).

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'SubscriptionStatus') THEN
    CREATE TYPE "SubscriptionStatus" AS ENUM ('free', 'pro');
  END IF;

  IF (SELECT data_type FROM information_schema.columns
      WHERE table_schema = current_schema() AND table_name = 'User' AND column_name = 'subscriptionStatus') = 'text' THEN
    UPDATE "User" SET "subscriptionStatus" = 'free' WHERE "subscriptionStatus" IS NULL OR "subscriptionStatus" NOT IN ('free', 'pro');
    ALTER TABLE "User" ALTER COLUMN "subscriptionStatus" DROP DEFAULT;
    ALTER TABLE "User" ALTER COLUMN "subscriptionStatus" TYPE "SubscriptionStatus" USING "subscriptionStatus"::"SubscriptionStatus";
    ALTER TABLE "User" ALTER COLUMN "subscriptionStatus" SET DEFAULT 'free';
    ALTER TABLE "User" ALTER COLUMN "subscriptionStatus" SET NOT NULL;
  END IF;

  IF (SELECT data_type FROM information_schema.columns
      WHERE table_schema = current_schema() AND table_name = 'Subscription' AND column_name = 'status') = 'text' THEN
    UPDATE "Subscription" SET "status" = 'free' WHERE "status" IS NULL OR "status" NOT IN ('free', 'pro');
    ALTER TABLE "Subscription" ALTER COLUMN "status" DROP DEFAULT;
    ALTER TABLE "Subscription" ALTER COLUMN "status" TYPE "SubscriptionStatus" USING "status"::"SubscriptionStatus";
    ALTER TABLE "Subscription" ALTER COLUMN "status" SET DEFAULT 'free';
    ALTER TABLE "Subscription" ALTER COLUMN "status" SET NOT NULL;
  END IF;
END $$;
