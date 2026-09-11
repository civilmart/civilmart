import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { placeholderImage, type StoreProduct } from "@/lib/store-front";

const TEMPLATES = [
  {
    eyebrow: "New arrival",
    title: (name: string) => `${name} — ladies' favourite`,
    subtitle: "Fresh and long-lasting. New batch just bottled.",
    gradient: "from-rose-100 to-pink-50 text-rose-900",
    chip: "bg-rose-600",
  },
  {
    eyebrow: "Best seller",
    title: (name: string) => `Most loved: ${name}`,
    subtitle: "The scent our customers keep ordering again.",
    gradient: "from-amber-100 to-orange-50 text-amber-900",
    chip: "bg-amber-600",
  },
  {
    eyebrow: "Limited stock",
    title: (name: string) => `${name} — grab it now`,
    subtitle: "Cash on delivery. Order today, pay at your door.",
    gradient: "from-violet-100 to-fuchsia-50 text-violet-900",
    chip: "bg-violet-600",
  },
];

export function PromoBanners({
  products,
}: {
  products: StoreProduct[];
}) {
  const banners = products.slice(0, TEMPLATES.length);

  if (banners.length === 0) return null;

  return (
    <section className="grid gap-4 md:grid-cols-3">
      {banners.map((product, index) => {
        const template = TEMPLATES[index];

        return (
          <Link
            key={product.id}
            href={`/products/${product.id}`}
            className={`group relative overflow-hidden rounded-2xl bg-gradient-to-br ${template.gradient} p-5 shadow-sm transition hover:shadow-md`}
          >
            <div className="relative z-10 max-w-[60%]">
              <span
                className={`inline-block rounded-full ${template.chip} px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white`}
              >
                {template.eyebrow}
              </span>
              <h3 className="mt-2 text-lg font-bold leading-tight">
                {template.title(product.name)}
              </h3>
              <p className="mt-1 text-xs opacity-80">
                {template.subtitle}
              </p>
              <span className="mt-3 inline-flex items-center gap-1 text-sm font-semibold">
                Shop now <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
              </span>
            </div>

            <div className="absolute -right-4 -top-4 h-28 w-28 overflow-hidden rounded-2xl bg-white/70 p-1.5 shadow-sm transition group-hover:-translate-y-1 sm:h-32 sm:w-32">
              <Image
                src={product.imageUrl || placeholderImage(product.name)}
                alt={product.name}
                width={160}
                height={160}
                className="h-full w-full rounded-xl object-cover"
              />
            </div>
          </Link>
        );
      })}
    </section>
  );
}