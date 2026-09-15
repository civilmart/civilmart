"use client";

import { useEffect, useRef } from "react";
import JsBarcode from "jsbarcode";

type BarcodeLabelProps = {
  barcode: string;
  name: string;
  brand?: string | null;
  code?: string;
};

export const BARCODE_SETTINGS = {
  format: "CODE128" as const,
  width: 2,
  height: 40,
  fontSize: 12,
  displayValue: true,
  margin: 0,
};

const LABEL_WIDTH = "w-52";

function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  return text.slice(0, max).trimEnd();
}

export function BarcodeLabel({ barcode, name, brand, code }: BarcodeLabelProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current || !barcode) return;
    try {
      JsBarcode(canvasRef.current, barcode, BARCODE_SETTINGS);
    } catch {
      // skip invalid barcodes
    }
  }, [barcode]);

  const label = brand ? `${truncate(name, 38)} - ${truncate(brand, 12)}` : truncate(name, 50);

  return (
    <div
      className={`flex ${LABEL_WIDTH} flex-col items-center justify-center gap-0.5 rounded border border-black p-1.5 text-center print:p-2`}
    >
      <div className="flex w-full justify-center">
        <canvas ref={canvasRef} className="max-w-full" />
      </div>
      {code && (
        <p className="text-[10px] leading-tight text-muted-foreground">{code}</p>
      )}
      <p className="line-clamp-3 text-[11px] font-semibold leading-tight">
        {label}
      </p>
    </div>
  );
}

export function BarcodePrintArea({
  id,
  items,
}: {
  id: string;
  items: { key: string; barcode: string; name: string; brand?: string | null; code?: string }[];
}) {
  return (
    <div className="hidden print:block" id={id}>
      <div className="flex flex-wrap gap-3 p-4">
        {items.map((item) => (
          <BarcodeLabel
            key={item.key}
            barcode={item.barcode}
            name={item.name}
            brand={item.brand}
            code={item.code}
          />
        ))}
      </div>
    </div>
  );
}
