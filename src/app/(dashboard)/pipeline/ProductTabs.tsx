import Link from "next/link";

type Product = { id: number; slug: string; name: string };

// §7.2 — tabs styled as the display-type eyebrow row; active tab gets the
// same vertical-accent-bar treatment as the sidebar nav.
export function ProductTabs({
  products,
  activeSlug,
}: {
  products: Product[];
  activeSlug: string;
}) {
  const tabs = [...products.map((p) => ({ slug: p.slug, name: p.name })), { slug: "all", name: "All" }];

  return (
    <nav className="-mx-4 flex gap-1 overflow-x-auto border-b border-border px-4 sm:mx-0 sm:px-0">
      {tabs.map((tab) => {
        const active = tab.slug === activeSlug;
        return (
          <Link
            key={tab.slug}
            href={`/pipeline?product=${tab.slug}`}
            className={
              active
                ? "shrink-0 whitespace-nowrap border-b-2 border-accent px-3 py-2 font-display text-body-sm uppercase tracking-[0.04em] text-text"
                : "shrink-0 whitespace-nowrap border-b-2 border-transparent px-3 py-2 font-display text-body-sm uppercase tracking-[0.04em] text-text-muted hover:text-text"
            }
          >
            {tab.name}
          </Link>
        );
      })}
    </nav>
  );
}
