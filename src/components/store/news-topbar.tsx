const DEFAULT_MESSAGES = [
  "Welcome to Civil Mart",
  "Building materials, tools and hardware for every project",
  "Cash on Delivery — pay when your order arrives",
  "Bulk & contractor orders welcome",
];

export function NewsTopbar({ messages }: { messages?: string[] }) {
  const list =
    messages && messages.length > 0 ? messages : DEFAULT_MESSAGES;

  const row = (
    <div className="flex shrink-0 items-center">
      {list.map((message) => (
        <span
          key={message}
          className="flex items-center whitespace-nowrap px-8 text-[12px] font-semibold uppercase tracking-[0.1em]"
        >
          {message}
          <span className="ml-16 h-1 w-1 rounded-full bg-amber-400/60" />
        </span>
      ))}
    </div>
  );

  return (
    <div className="overflow-hidden bg-amber-500 py-2 text-slate-950">
      <div className="flex w-max animate-marquee">
        {row}
        {row}
      </div>
    </div>
  );
}