import { cookies } from "next/headers";
import { randomBytes, scryptSync, timingSafeEqual } from "crypto";
import { prisma } from "@/lib/prisma";
import type { UserModel } from "@/generated/prisma/models/User";

export {
  SESSION_COOKIE,
  signSessionToken,
  verifySessionToken,
} from "@/lib/session";

export type { AuthPayload } from "@/lib/session";

export async function getSessionUser(): Promise<UserModel | null> {
  const { SESSION_COOKIE, verifySessionToken } = await import("@/lib/session");
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;

  if (!token) {
    return null;
  }

  const payload = await verifySessionToken(token);

  if (!payload) {
    return null;
  }

  return prisma.user.findFirst({
    where: {
      id: payload.id,
      isActive: true,
    },
  });
}

export async function getSessionUserOrThrow() {
  const user = await getSessionUser();

  if (!user) {
    throw new Error("Unauthorized");
  }

  return user;
}

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(
  password: string,
  stored: string | null
): boolean {
  if (!stored) {
    return false;
  }

  const [salt, hash] = stored.split(":");

  if (!salt || !hash) {
    return false;
  }

  const candidate = scryptSync(password, salt, 64);

  return timingSafeEqual(
    candidate,
    Buffer.from(hash, "hex")
  );
}
