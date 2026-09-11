"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

type CarouselProps = {
  slides: React.ReactNode[];
  autoAdvanceMs?: number;
  className?: string;
  showArrows?: boolean;
};

export function Carousel({
  slides,
  autoAdvanceMs,
  className = "",
  showArrows = true,
}: CarouselProps) {
  const [current, setCurrent] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState(0);
  const dragStartX = useRef<number | null>(null);

  const count = slides.length;

  useEffect(() => {
    if (!autoAdvanceMs || count <= 1) return;

    const id = setInterval(() => {
      setCurrent((prev) => (prev + 1) % count);
    }, autoAdvanceMs);

    return () => clearInterval(id);
  }, [autoAdvanceMs, count]);

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    dragStartX.current = e.clientX;
    setDragging(true);
  }, []);

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!dragging || dragStartX.current === null) return;
      setDragOffset(e.clientX - dragStartX.current);
    },
    [dragging]
  );

  const onPointerUp = useCallback(() => {
    if (dragStartX.current === null) return;

    if (Math.abs(dragOffset) > 40) {
      setCurrent((prev) =>
        dragOffset > 0
          ? (prev - 1 + count) % count
          : (prev + 1) % count
      );
    }

    dragStartX.current = null;
    setDragging(false);
    setDragOffset(0);
  }, [dragOffset, count]);

  if (count === 0) return null;

  const translateX =
    -current * 100 + (dragging ? (dragOffset / 600) * 100 : 0);

  return (
    <div
      className={`relative overflow-hidden select-none ${className}`}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onPointerLeave={onPointerUp}
    >
      <div
        className="flex transition-transform duration-500 ease-out"
        style={{
          transform: `translateX(${translateX}%)`,
          transition: dragging ? "none" : undefined,
        }}
      >
        {slides.map((slide, index) => (
          <div
            key={index}
            className="w-full shrink-0"
            aria-hidden={index !== current}
          >
            {slide}
          </div>
        ))}
      </div>

      {showArrows && count > 1 && (
        <>
          <button
            type="button"
            aria-label="Previous slide"
            onClick={() => setCurrent((prev) => (prev - 1 + count) % count)}
            className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-white/80 p-2 text-slate-700 shadow-sm backdrop-blur transition hover:bg-white"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            type="button"
            aria-label="Next slide"
            onClick={() => setCurrent((prev) => (prev + 1) % count)}
            className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-white/80 p-2 text-slate-700 shadow-sm backdrop-blur transition hover:bg-white"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </>
      )}

      {count > 1 && (
        <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1.5">
          {slides.map((_, index) => (
            <button
              key={index}
              type="button"
              aria-label={`Go to slide ${index + 1}`}
              onClick={() => setCurrent(index)}
              className={`h-2 w-2 rounded-full transition ${
                index === current
                  ? "w-5 bg-amber-500"
                  : "bg-white/70 hover:bg-white"
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}