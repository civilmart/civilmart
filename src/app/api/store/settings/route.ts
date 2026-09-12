import { NextResponse } from "next/server";
import { getSiteSettings } from "@/lib/site-settings";

export async function GET() {
  try {
    const settings = await getSiteSettings();

    return NextResponse.json({ success: true, data: settings });
  } catch (error) {
    console.error("GET store settings error:", error);

    return NextResponse.json(
      { success: false, error: "Failed to load settings" },
      { status: 500 }
    );
  }
}