const MESSAGES = [
  "Welcome to NaranScents",
  "ENJOY 5% OFF ON YOUR FIRST PURCHASE",
  "Cash on Delivery — pay when your order arrives",
  "Free delivery on orders over Rs 2,000",
];

export function NewsTopbar() {
  const row = (
    <div className="flex shrink-0 items-center">
      {MESSAGES.map((message) => (
        <span
          key={message}
          className="flex items-center whitespace-nowrap px-8 text-[13px] font-semibold uppercase tracking-[0.08em]"
        >
          {message}
          <span className="ml-16 h-1.5 w-1.5 rounded-full bg-white/40" />
        </span>
      ))}
    </div>
  );

  return (
    <div className="overflow-hidden bg-slate-900 py-2.5 text-white">
      <div className="flex w-max animate-marquee">
        {row}
        {row}
      </div>
    </div>
  );
}