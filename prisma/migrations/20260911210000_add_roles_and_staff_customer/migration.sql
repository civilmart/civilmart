-- Roles: USER (visitor / enduser) and SUPERADMIN
ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'USER';
ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'SUPERADMIN';

-- Staff delivery profile fields (admin can also be a customer)
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "phone" TEXT;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "address" TEXT;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "city" TEXT;

-- Link customers to staff accounts (admin-as-customer)
ALTER TABLE "customers" ADD COLUMN IF NOT EXISTS "userId" TEXT;
ALTER TABLE "customers" ADD COLUMN IF NOT EXISTS "city" TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS "customers_userId_key" ON "customers"("userId");
ALTER TABLE "customers" ADD CONSTRAINT "customers_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;