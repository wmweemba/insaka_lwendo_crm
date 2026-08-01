import { listEngagementsForBoard } from "@/db/queries/pipeline";
import { listActiveProducts } from "@/db/queries/engagements";
import { currentTimestamp } from "@/lib/now";
import { AllTable } from "./AllTable";
import { PipelineBoard } from "./PipelineBoard";
import { ProductTabs } from "./ProductTabs";

export default async function PipelinePage({
  searchParams,
}: {
  searchParams: Promise<{ product?: string }>;
}) {
  const { product } = await searchParams;
  const [products, engagements] = await Promise.all([
    listActiveProducts(),
    listEngagementsForBoard(),
  ]);

  const isAll = product === "all" || !product;
  const filtered = isAll
    ? engagements
    : engagements.filter((e) => e.product.slug === product);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-display text-display-sm uppercase tracking-[0.04em] text-text">
        Pipeline
      </h1>
      <ProductTabs products={products} activeSlug={isAll ? "all" : product!} />
      {isAll ? (
        <AllTable engagements={filtered} />
      ) : (
        <PipelineBoard key={product} engagements={filtered} now={currentTimestamp()} />
      )}
    </div>
  );
}
