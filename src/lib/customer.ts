import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { CUSTOMER_COOKIE, verifyCustomerToken } from "@/lib/session";
import type { UserModel } from "@/generated/prisma/models/User";

export async function getCustomerUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get(CUSTOMER_COOKIE)?.value;

  if (!token) {
    return null;
  }

  const payload = await verifyCustomerToken(token);

  if (!payload) {
    return null;
  }

  return prisma.customer.findUnique({
    where: { id: payload.id },
  });
}

export async function getCustomerUserOrThrow() {
  const customer = await getCustomerUser();

  if (!customer) {
    throw new Error("Unauthorized");
  }

  return customer;
}

// Returns the customer account linked to a staff user, creating or
// re-using one so staff can also shop on the storefront with the same
// username and password.
export async function getOrCreateLinkedCustomer(user: UserModel) {
  const linked = await prisma.customer.findUnique({
    where: { userId: user.id },
  });

  if (linked) {
    return linked;
  }

  const identity: Array<{ username?: string; email?: string; phone?: string }> =
    [{ username: user.username }];
  if (user.email) identity.push({ email: user.email.toLowerCase() });
  if (user.phone) identity.push({ phone: user.phone });

  const existing = await prisma.customer.findFirst({
    where: { OR: identity },
  });

  if (existing) {
    if (existing.userId && existing.userId !== user.id) {
      throw new Error("Account is already linked to another user");
    }

    return prisma.customer.update({
      where: { id: existing.id },
      data: {
        userId: user.id,
        passwordHash: user.passwordHash ?? existing.passwordHash,
      },
    });
  }

  return prisma.customer.create({
    data: {
      userId: user.id,
      username: user.username,
      passwordHash: user.passwordHash ?? "",
      name: user.name,
      email: user.email?.toLowerCase() || null,
      phone: user.phone,
      address: user.address,
      city: user.city,
    },
  });
}

const ORDER_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

export function generateOrderNumber(): string {
  let suffix = "";
  for (let i = 0; i < 6; i += 1) {
    suffix += ORDER_ALPHABET.charAt(
      Math.floor(Math.random() * ORDER_ALPHABET.length)
    );
  }
  return `CM-${suffix}`;
}