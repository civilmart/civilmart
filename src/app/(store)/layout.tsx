import { CartProvider } from "@/context/cart-context";
import { WishlistProvider } from "@/context/wishlist-context";
import { StoreHeader } from "@/components/store/store-header";
import { StoreFooter } from "@/components/store/store-footer";
import { NewsTopbar } from "@/components/store/news-topbar";
import { BackToTop } from "@/components/store/back-to-top";
import { getSiteSettings } from "@/lib/site-settings";

export default async function StoreLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const settings = await getSiteSettings();

  return (
    <CartProvider>
      <WishlistProvider>
        <div className="flex min-h-screen flex-col">
          <NewsTopbar messages={settings.topbarMessages} />
          <StoreHeader
            siteName={settings.siteName}
            helpline={settings.helpline}
          />

          <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6">
            {children}
          </main>

          <StoreFooter
            siteName={settings.siteName}
            footerText={settings.footerText}
            helpline={settings.helpline}
            codNote={settings.codNote}
          />
          <BackToTop />
        </div>
      </WishlistProvider>
    </CartProvider>
  );
}