import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUserOrThrow } from "@/lib/auth";
import {
  getSiteSettings,
  SITE_SETTING_KEYS,
} from "@/lib/site-settings";

export async function GET() {
  try {
    const settings = await getSiteSettings();

    return NextResponse.json({ success: true, data: settings });
  } catch (error) {
    console.error("GET settings error:", error);

    return NextResponse.json(
      { success: false, error: "Failed to load settings" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    await getSessionUserOrThrow();

    const body = await request.json();
    const updates: { key: string; value: string }[] = [];

    for (const key of SITE_SETTING_KEYS) {
      if (body[key] === undefined) continue;

      let value: string;

      if (typeof body[key] === "string") {
        value = body[key];
      } else {
        value = JSON.stringify(body[key]);
      }

      updates.push({ key, value });
    }

    if (updates.length === 0) {
      return NextResponse.json(
        { success: false, error: "No settings to update" },
        { status: 400 }
      );
    }

    for (const update of updates) {
      await prisma.siteSetting.upsert({
        where: { key: update.key },
        update: { value: update.value },
        create: { key: update.key, value: update.value },
      });
    }

    const settings = await getSiteSettings();

    return NextResponse.json({ success: true, data: settings });
  } catch (error) {
    console.error("PATCH settings error:", error);

    return NextResponse.json(
      { success: false, error: "Failed to update settings" },
      { status: 500 }
    );
  }
}