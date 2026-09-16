import Link from "next/link";
import { ChevronRight, PackageX } from "lucide-react";
import { getProductById, getRelatedProducts } from "@/lib/store-data";
import { ProductDetailClient } from "@/components/store/product-detail-client";
import { ProductCard } from "@/components/store/product-card";

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const product = await getProductById(id);

  if (!product) {
    return (
      <div className="flex flex-col items-center justify-center p-20 text-center">
        <PackageX className="h-16 w-16 text-muted-foreground/50" />
        <h2 className="mt-4 text-xl font-bold">Product not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          This product may have been removed or is no longer available.
        </p>
        <Link
          href="/products"
          className="mt-6 inline-flex items-center gap-2 rounded-md bg-amber-500 px-5 py-2.5 text-sm font-semibold text-slate-950"
        >
          Browse Products
        </Link>
      </div>
    );
  }

  const relatedProducts = await getRelatedProducts(
    product.id,
    product.category,
    4
  );

  const breadcrumbs = [
    { label: "Home", href: "/" },
    { label: "Products", href: "/products" },
    ...(product.category
      ? [
          {
            label: product.category,
            href: `/products?category=${encodeURIComponent(product.category)}`,
          },
        ]
      : []),
    { label: product.name, href: null },
  ];

  return (
    <>
      <nav className="flex flex-wrap items-center gap-1 text-sm text-muted-foreground">
        {breadcrumbs.map((crumb, i) => (
          <span key={i} className="flex items-center gap-1">
            {i > 0 && <ChevronRight className="h-3 w-3 shrink-0" />}
            {crumb.href ? (
              <Link href={crumb.href} className="hover:text-slate-900">
                {crumb.label}
              </Link>
            ) : (
              <span className="text-slate-900">{crumb.label}</span>
            )}
          </span>
        ))}
      </nav>

      <ProductDetailClient product={product} />

      {relatedProducts.length > 0 && (
        <section className="space-y-4">
          <h2 className="text-xl font-bold tracking-tight">
            {product.category ? "Related Products" : "You may also like"}
          </h2>
          <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
            {relatedProducts.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      )}
    </>
  );
}
