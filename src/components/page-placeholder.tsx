type PagePlaceholderProps = {
  title: string;
  description: string;
};

export function PagePlaceholder({
  title,
  description,
}: PagePlaceholderProps) {
  return (
    <div className="p-6 lg:p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
        <p className="mt-1 text-muted-foreground">{description}</p>
      </div>

      <div className="rounded-xl border bg-card p-10 text-center shadow-sm">
        <p className="text-sm text-muted-foreground">
          This module is under development.
        </p>
      </div>
    </div>
  );
}