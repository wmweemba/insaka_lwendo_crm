import { db } from "@/db";
import { products } from "@/db/schema";
import { asc, eq } from "drizzle-orm";

export function listActiveProducts() {
  return db
    .select()
    .from(products)
    .where(eq(products.active, true))
    .orderBy(asc(products.name));
}
