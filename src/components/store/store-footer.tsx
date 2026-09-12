import Link from "next/link";
import { Phone } from "lucide-react";

function splitBrand(siteName: string): {
  head: string;
  tail: string;
} {
  const match = siteName.match(/^(.*?)(Scents.*)?$/);

  return {
    head: match?.[1] || siteName,
    tail: match?.[2] || "",
  };
}

export function StoreFooter({
  siteName,
  footerText,
  helpline,
  codNote,
}: {
  siteName: string;
  footerText: string;
  helpline: string;
  codNote: string;
}) {
  const brand = splitBrand(siteName);

  return (
    <footer className="mt-16 border-t bg-slate-50">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 sm:px-6 md:grid-cols-3">
        <div>
          <p className="text-lg font-bold tracking-tight">
            {brand.head}
            {brand.tail && (
              <span className="text-amber-600">{brand.tail}</span>
            )}
          </p>
          {footerText && (
            <p className="mt-2 max-w-xs text-sm text-muted-foreground">
              {footerText}
            </p>
          )}
        </div>

        <div>
          <p className="mb-3 text-sm font-semibold">Shop</p>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li><Link href="/products" className="hover:text-slate-900">All fragrances</Link></li>
            <li><Link href="/cart" className="hover:text-slate-900">Cart</Link></li>
            <li><Link href="/track" className="hover:text-slate-900">Track order</Link></li>
            <li><Link href="/account" className="hover:text-slate-900">My account</Link></li>
          </ul>
        </div>

        <div>
          <p className="mb-3 text-sm font-semibold">Contact</p>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li>Cash on delivery available nationwide</li>
            {helpline && (
              <li className="text-slate-700">
                <a
                  href={`tel:${helpline.replace(/[\s-]/g, "")}`}
                  className="flex items-center gap-1.5 font-medium hover:text-amber-700"
                >
                  <Phone className="h-3.5 w-3.5 text-amber-600" />
                  {helpline}
                </a>
              </li>
            )}
          </ul>
          {codNote && (
            <p className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
              {codNote}
            </p>
          )}
        </div>
      </div>

      <div className="border-t py-4 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} {siteName}. All rights reserved.
      </div>
    </footer>
  );
}