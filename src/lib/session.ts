import { SignJWT, jwtVerify } from "jose";

export const SESSION_COOKIE = "naranscents_session";
const SESSION_MAX_AGE_DAYS = 7;

export type AuthPayload = {
  id: string;
  username: string;
  role: string;
};

function getSecret() {
  const secret = process.env.AUTH_SECRET;

  if (!secret) {
    throw new Error("AUTH_SECRET is not configured");
  }

  return new TextEncoder().encode(secret);
}

export async function signSessionToken(
  payload: AuthPayload
): Promise<string> {
  const secret = getSecret();

  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE_DAYS}d`)
    .sign(secret);
}

export async function verifySessionToken(
  token: string
): Promise<AuthPayload | null> {
  try {
    const secret = getSecret();
    const { payload } = await jwtVerify(token, secret);

    if (!payload.id || !payload.username || !payload.role) {
      return null;
    }

    return {
      id: payload.id as string,
      username: payload.username as string,
      role: payload.role as string,
    };
  } catch {
    return null;
  }
}
