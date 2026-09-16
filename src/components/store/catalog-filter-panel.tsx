"use client";

import { useState } from "react";
import { SlidersHorizontal } from "lucide-react";
import { cn } from "cn";
import { type CatalogueGroup } from "@/lib/store-front";

export type CatalogFilterState = {
  category: string | null;
  priceMin: string;
  priceMax: string;
  inStockOnly: boolean;
};

const EMPTY_STATE: CatalogFilterState = {
  category: null,
  priceMin: "",
  priceMax: "",
  inStockOnly: false,
};

function commitPrice(onChange: (patch: Partial<CatalogFilterState>) => void) {
  return (event: React.FormEvent) => {
    event.preventDefault();

    const target = event.target as HTMLFormElement;
    const min = (target.elements.namedItem("price-min") as HTMLInputElement).value;
    const max = (target.elements.namedItem("price-max") as HTMLInputElement).value;

    onChange({ priceMin: min, priceMax: max });
  };
}

export function CatalogFilterPanel({
  groups,
  active,
  activeCount,
  onChange,
  className,
}: {
  groups: CatalogueGroup[];
  active: CatalogFilterState;
  activeCount: number;
  onChange: (patch: Partial<CatalogFilterState>) => void;
  className?: string;
}) {
  const [expanded, setExpanded] = useState<Set<string>>(
    () => new Set(groups.map((g) => g.name))
  );

  function toggleGroup(name: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(name)) {
        next.delete(name);
      } else {
        next.add(name);
      }
      return next;
    });
  }

  function reset() {
    onChange(EMPTY_STATE);
  }

  return (
    <div className={cn("space-y-5", className)}>
      <div className="flex items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-slate-900">
          <SlidersHorizontal className="h-4 w-4 text-amber-600" />
          Filters
        </h2>
        {activeCount > 0 && (
          <button
            type="button"
            onClick={reset}
            className="text-xs font-semibold text-amber-700 hover:underline"
          >
            Clear all ({activeCount})
          </button>
        )}
      </div>

      <div className="space-y-5 border-t border-slate-200 pt-4">
        <section>
          <button
            type="button"
            onClick={() => onChange({ category: null })}
            className={cn(
              "w-full rounded-md px-2 py-1.5 text-left text-sm font-semibold transition",
              active.category === null
                ? "bg-slate-900 text-white"
                : "text-slate-700 hover:bg-slate-100"
            )}
          >
            All categories
          </button>

          {groups.map((group) => {
            const isOpen = expanded.has(group.name);

            return (
              <div key={group.name} className="mt-2">
                <button
                  type="button"
                  onClick={() => toggleGroup(group.name)}
                  className="flex w-full items-center justify-between px-2 py-1.5 text-left text-[10px] font-bold uppercase tracking-wider text-slate-500 transition hover:text-slate-800"
                >
                  {group.name}
                  <ChevronDownIcon open={isOpen} />
                </button>

                {isOpen && (
                  <div className="mt-1 space-y-0.5">
                    {group.categories.map((category) => {
                      const isActive = active.category === category.name;

                      return (
                        <button
                          key={category.id}
                          type="button"
                          onClick={() =>
                            onChange({
                              category: isActive ? null : category.name,
                            })
                          }
                          className={cn(
                            "flex w-full items-center justify-between gap-2 rounded-md px-2 py-1.5 text-left text-sm transition",
                            isActive
                              ? "bg-amber-50 font-semibold text-amber-900 ring-1 ring-amber-300"
                              : "text-slate-700 hover:bg-slate-100"
                          )}
                        >
                          <span className="truncate">{category.name}</span>
                          <span
                            className={cn(
                              "shrink-0 rounded-sm px-1.5 py-0.5 text-[10px] font-semibold",
                              isActive
                                ? "bg-amber-500 text-white"
                                : "bg-slate-100 text-slate-500"
                            )}
                          >
                            {category.count}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </section>

        <section>
          <h3 className="px-2 text-[10px] font-bold uppercase tracking-wider text-slate-500">
            Price
          </h3>
          <form
            onSubmit={commitPrice(onChange)}
            className="mt-1.5 flex items-center gap-2 px-2"
          >
            <input
              key={`min-${active.priceMin}`}
              name="price-min"
              type="number"
              min={0}
              placeholder="Min"
              defaultValue={active.priceMin}
              className="w-full rounded-md border border-slate-200 px-2 py-1.5 text-sm outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-300"
            />
            <span className="text-slate-400">—</span>
            <input
              key={`max-${active.priceMax}`}
              name="price-max"
              type="number"
              min={0}
              placeholder="Max"
              defaultValue={active.priceMax}
              className="w-full rounded-md border border-slate-200 px-2 py-1.5 text-sm outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-300"
            />
            <button
              type="submit"
              className="rounded-md bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-slate-700"
            >
              Apply
            </button>
          </form>
        </section>

        <section>
          <label className="flex cursor-pointer items-center justify-between gap-2 rounded-md border border-slate-200 px-3 py-2.5 hover:border-amber-300">
            <span className="text-sm font-medium text-slate-700">
              In stock only
            </span>
            <input
              type="checkbox"
              checked={active.inStockOnly}
              onChange={(e) => onChange({ inStockOnly: e.target.checked })}
              className="h-4 w-4 accent-amber-600"
            />
          </label>
        </section>
      </div>
    </div>
  );
}

function ChevronDownIcon({ open }: { open: boolean }) {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="currentColor"
      className={cn(
        "h-4 w-4 transition-transform",
        open ? "rotate-180" : ""
      )}
    >
      <path
        fillRule="evenodd"
        d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
        clipRule="evenodd"
      />
    </svg>
  );
}