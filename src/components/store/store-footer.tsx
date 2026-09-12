import Link from "next/link";
import { Phone } from "lucide-react";

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
  return (
    <footer className="mt-16 border-t-4 border-amber-500 bg-slate-900 text-slate-300">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 sm:px-6 md:grid-cols-3">
        <div>
          <p className="text-lg font-extrabold tracking-tight text-white">
            {siteName}
            <span className="text-amber-400">.</span>
          </p>
          {footerText && (
            <p className="mt-2 max-w-xs text-sm text-slate-400">
              {footerText}
            </p>
          )}
        </div>

        <div>
          <p className="mb-3 text-sm font-bold uppercase tracking-wide text-white">
            Shop
          </p>
          <ul className="space-y-2 text-sm text-slate-400">
            <li><Link href="/products" className="hover:text-amber-400">All products</Link></li>
            <li><Link href="/cart" className="hover:text-amber-400">Cart</Link></li>
            <li><Link href="/track" className="hover:text-amber-400">Track order</Link></li>
            <li><Link href="/account" className="hover:text-amber-400">My account</Link></li>
          </ul>
        </div>

        <div>
          <p className="mb-3 text-sm font-bold uppercase tracking-wide text-white">
            Contact
          </p>
          <ul className="space-y-2 text-sm text-slate-400">
            <li>Cash on delivery available</li>
            {helpline && (
              <li className="text-slate-200">
                <a
                  href={`tel:${helpline.replace(/[\s-]/g, "")}`}
                  className="flex items-center gap-1.5 font-medium hover:text-amber-400"
                >
                  <Phone className="h-3.5 w-3.5 text-amber-400" />
                  {helpline}
                </a>
              </li>
            )}
          </ul>
          {codNote && (
            <p className="mt-4 rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-xs text-slate-300">
              {codNote}
            </p>
          )}
        </div>
      </div>

      <div className="border-t border-slate-800 py-4 text-center text-xs text-slate-500">
        © {new Date().getFullYear()} {siteName}. All rights reserved.
      </div>
    </footer>
  );
}