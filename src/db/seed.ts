import { db } from "./index";
import { products } from "./schema";

// Seed set per docs/planning/01-data-model.md — products is a reference
// table, not an enum, so new ventures get added by insert, not migration.
const SEED_PRODUCTS = [
  { slug: "bazabooks", name: "BazaBooks" },
  { slug: "chama360", name: "Chama360" },
  { slug: "catering-scheduler", name: "Catering Scheduler" },
  { slug: "nexus-web", name: "Nexus Web" },
  { slug: "other", name: "Other" },
] as const;

async function seedProducts() {
  await db
    .insert(products)
    .values([...SEED_PRODUCTS])
    .onConflictDoNothing({ target: products.slug });

  console.log(`Seeded ${SEED_PRODUCTS.length} products (existing rows left untouched).`);
}

seedProducts()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
