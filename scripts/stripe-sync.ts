// scripts/stripe-sync.ts
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import Stripe from "stripe";

const prisma = new PrismaClient();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
  apiVersion: "2024-06-20" as any,
});

function slugify(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

async function main() {
  const list = (process.env.STRIPE_PRICE_IDS ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  if (list.length === 0) {
    throw new Error(
      "Bitte STRIPE_PRICE_IDS=price_xxx,price_yyy setzen (kommagetrennt, ohne Leerzeichen)."
    );
  }

  for (const priceId of list) {
    const price = await stripe.prices.retrieve(priceId, { expand: ["product"] });

    if (!price.active) {
      console.warn(`⚠ ${priceId} ist inaktiv – übersprungen`);
      continue;
    }
    if (typeof price.unit_amount !== "number") {
      console.warn(`⚠ ${priceId} hat keine unit_amount – übersprungen`);
      continue;
    }

    const product = price.product as Stripe.Product | null;
    const title = product?.name ?? `Produkt ${product?.id ?? ""}`;
    const description = product?.description ?? "";

    // slug aus Produkt-Metadaten (slug) oder aus dem Produktnamen erzeugen
    const slug =
      (product?.metadata?.slug as string | undefined) || slugify(title);

    // optionale Metadaten (falls im Stripe-Product gepflegt)
    const passPercent = Number(product?.metadata?.passPercent ?? 60);
    const allowImmediateFeedback =
      (product?.metadata?.allowImmediateFeedback as string | undefined) ===
      "true";

    const existing = await prisma.exam.findUnique({
      where: { slug },
      select: { id: true },
    });

    if (!existing) {
      await prisma.exam.create({
        data: {
          slug,
          title,
          description,
          priceCents: price.unit_amount,
          stripePriceId: price.id,
          isPublished: true,
          passPercent,
          allowImmediateFeedback,
        },
      });
      console.log(`➕ Exam angelegt: ${slug} (price: ${price.id})`);
    } else {
      await prisma.exam.update({
        where: { slug },
        data: {
          title,
          description,
          priceCents: price.unit_amount,
          stripePriceId: price.id,
          passPercent,
          allowImmediateFeedback,
        },
      });
      console.log(`♻ Exam aktualisiert: ${slug} (price: ${price.id})`);
    }
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });