import { CartProvider } from "@/context/cart-context";
import { WishlistProvider } from "@/context/wishlist-context";
import { StoreHeader } from "@/components/store/store-header";
import { StoreFooter } from "@/components/store/store-footer";
import { NewsTopbar } from "@/components/store/news-topbar";
import { BackToTop } from "@/components/store/back-to-top";

export default function StoreLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <CartProvider>
      <WishlistProvider>
        <div className="flex min-h-screen flex-col">
          <NewsTopbar />
          <StoreHeader />

          <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6">
            {children}
          </main>

          <StoreFooter />
          <BackToTop />
        </div>
      </WishlistProvider>
    </CartProvider>
  );
}