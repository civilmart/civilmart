CREATE TABLE IF NOT EXISTS "site_settings" (
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "site_settings_pkey" PRIMARY KEY ("key")
);

INSERT INTO "site_settings" ("key", "value")
VALUES
    ('siteName', 'NaranScents'),
    ('helpline', ''),
    ('footerText', 'Fresh, long-lasting fragrances at honest prices.'),
    ('topbarMessages', '["Welcome to NaranScents", "ENJOY 5% OFF ON YOUR FIRST PURCHASE", "Cash on Delivery — pay when your order arrives", "Free delivery on orders over Rs 2,000"]'),
    ('heroSlides', '[]')
ON CONFLICT ("key") DO NOTHING;