"use client";

import { useEffect, useRef, useState } from "react";
import {
  ChevronDown,
  ChevronUp,
  ImagePlus,
  Loader2,
  Plus,
  Save,
  Settings2,
  Trash2,
  Upload,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  DEFAULT_SITE_SETTINGS,
  type FooterCta,
  type HeroSlide,
  type SiteSettings,
} from "@/lib/site-settings.types";

type HeroSlideForm = HeroSlide;

function newSlide(): HeroSlideForm {
  return {
    id:
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `slide-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    imageUrl: "",
    heading: "",
    subheading: "",
    cta: "",
    href: "/products",
    active: true,
  };
}

export default function SiteSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [siteName, setSiteName] = useState("");
  const [siteDescription, setSiteDescription] = useState("");
  const [helpline, setHelpline] = useState("");
  const [footerText, setFooterText] = useState("");
  const [topbarMessages, setTopbarMessages] = useState("");
  const [heroSlides, setHeroSlides] = useState<HeroSlideForm[]>([]);
  const [currency, setCurrency] = useState("Rs");
  const [shippingFee, setShippingFee] = useState("0");
  const [freeShippingThreshold, setFreeShippingThreshold] =
    useState("0");
  const [codNote, setCodNote] = useState("");
  const [featuredProductCount, setFeaturedProductCount] = useState("4");
  const [ctaHeading, setCtaHeading] = useState("");
  const [ctaDescription, setCtaDescription] = useState("");
  const [ctaButtonText, setCtaButtonText] = useState("");
  const [ctaButtonHref, setCtaButtonHref] = useState("");
  const [ctaSecondaryText, setCtaSecondaryText] = useState("");
  const [ctaSecondaryHref, setCtaSecondaryHref] = useState("");

  const heroInput = useRef<HTMLInputElement>(null);
  const [uploadingSlideId, setUploadingSlideId] = useState<string | null>(
    null
  );

  useEffect(() => {
    fetch("/api/settings")
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok || !data.success) {
          throw new Error(data.error || "Failed to load settings");
        }
        return data.data as SiteSettings;
      })
      .then((settings) => {
        setSiteName(settings.siteName);
        setSiteDescription(settings.siteDescription);
        setHelpline(settings.helpline);
        setFooterText(settings.footerText);
        setTopbarMessages(settings.topbarMessages.join("\n"));
        setHeroSlides(settings.heroSlides);
        setCurrency(settings.currency);
        setShippingFee(String(settings.shippingFee));
        setFreeShippingThreshold(String(settings.freeShippingThreshold));
        setCodNote(settings.codNote);
        setFeaturedProductCount(String(settings.featuredProductCount ?? 4));
        const cta = settings.footerCta ?? DEFAULT_SITE_SETTINGS.footerCta;
        setCtaHeading(cta.heading);
        setCtaDescription(cta.description);
        setCtaButtonText(cta.buttonText);
        setCtaButtonHref(cta.buttonHref);
        setCtaSecondaryText(cta.secondaryText);
        setCtaSecondaryHref(cta.secondaryHref);
      })
      .catch((e) => {
        setError(e.message || "Failed to load settings");
      })
      .finally(() => setLoading(false));
  }, []);

  function updateSlide(
    id: string,
    field: keyof HeroSlideForm,
    value: HeroSlideForm[typeof field]
  ) {
    setHeroSlides((current) =>
      current.map((slide) =>
        slide.id === id ? { ...slide, [field]: value } : slide
      )
    );
  }

  function removeSlide(id: string) {
    setHeroSlides((current) => current.filter((slide) => slide.id !== id));
  }

  function addSlide() {
    setHeroSlides((current) => [...current, newSlide()]);
  }

  function moveSlide(id: string, direction: -1 | 1) {
    setHeroSlides((current) => {
      const index = current.findIndex((slide) => slide.id === id);
      const target = index + direction;

      if (index < 0 || target < 0 || target >= current.length) {
        return current;
      }

      const next = [...current];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  function uploadHeroImage(slideId: string) {
    const file = heroInput.current?.files?.[0];

    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);
    formData.append("purpose", "hero");

    setUploadingSlideId(slideId);

    fetch("/api/upload", {
      method: "POST",
      body: formData,
    })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.error || "Upload failed.");
        }
        return data.url as string;
      })
      .then((url) => {
        updateSlide(slideId, "imageUrl", url);
        setSuccess("Image uploaded — save settings to keep changes.");
      })
      .catch((e) => {
        setError(e.message || "Upload failed.");
      })
      .finally(() => {
        setUploadingSlideId(null);
        if (heroInput.current) heroInput.current.value = "";
      });
  }

  async function save() {
    setError("");
    setSuccess("");
    setSaving(true);

    try {
      const messages = topbarMessages
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean);

      const body = {
        siteName: siteName.trim() || "Civil Mart",
        siteDescription: siteDescription.trim(),
        helpline: helpline.trim(),
        footerText: footerText.trim(),
        topbarMessages: messages,
        heroSlides,
        currency: currency.trim() || "Rs",
        shippingFee: shippingFee.trim() === "" ? 0 : Number(shippingFee),
        freeShippingThreshold:
          freeShippingThreshold.trim() === ""
            ? 0
            : Number(freeShippingThreshold),
        codNote: codNote.trim(),
        featuredProductCount:
          featuredProductCount.trim() === ""
            ? 4
            : Math.max(1, Math.min(20, Number(featuredProductCount))),
        footerCta: {
          heading: ctaHeading.trim(),
          description: ctaDescription.trim(),
          buttonText: ctaButtonText.trim(),
          buttonHref: ctaButtonHref.trim(),
          secondaryText: ctaSecondaryText.trim(),
          secondaryHref: ctaSecondaryHref.trim(),
        },
      };

      const response = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || "Failed to save settings");
      }

      setSuccess("Site settings saved. Storefront updated.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save settings");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Settings2 className="h-6 w-6" />
            <h1 className="text-2xl font-bold">Site Settings</h1>
          </div>

          <p className="text-muted-foreground">
            Manage the store name, helpline number, hero slider images and
            other storefront text.
          </p>
        </div>

        <Button onClick={save} disabled={saving}>
          {saving ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Save className="mr-2 h-4 w-4" />
          )}
          Save Settings
        </Button>
      </div>

      {error && (
        <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      )}

      {success && (
        <div className="rounded-md bg-green-50 px-3 py-2 text-sm text-green-700">
          {success}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>General</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Store Name</Label>
              <Input
                value={siteName}
                onChange={(e) => setSiteName(e.target.value)}
                placeholder="Civil Mart"
              />
              <p className="text-xs text-muted-foreground">
                Shown in the header, footer and copyright line.
              </p>
            </div>

            <div className="space-y-2">
              <Label>Meta Description</Label>
              <Textarea
                value={siteDescription}
                onChange={(e) => setSiteDescription(e.target.value)}
                placeholder="Building materials, tools and hardware for every project."
                className="min-h-16"
              />
              <p className="text-xs text-muted-foreground">
                Used in the browser tab and search results.
              </p>
            </div>

            <div className="space-y-2">
              <Label>Helpline Number</Label>
              <Input
                value={helpline}
                onChange={(e) => setHelpline(e.target.value)}
                placeholder="+92 300 1234567"
              />
              <p className="text-xs text-muted-foreground">
                Shown in the header and footer. Leave empty to hide.
              </p>
            </div>

            <div className="space-y-2">
              <Label>Footer Tagline</Label>
              <Input
                value={footerText}
                onChange={(e) => setFooterText(e.target.value)}
                placeholder="Quality building materials and hardware for every project."
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Currency Symbol</Label>
                <Input
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  placeholder="Rs"
                />
                <p className="text-xs text-muted-foreground">
                  Prefix used by all price displays (e.g. Rs 2,400).
                </p>
              </div>

              <div className="space-y-2">
                <Label>Delivery Fee (per order)</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={shippingFee}
                  onChange={(e) => setShippingFee(e.target.value)}
                  placeholder="0"
                />
              </div>

              <div className="space-y-2">
                <Label>Free Delivery Above</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={freeShippingThreshold}
                  onChange={(e) =>
                    setFreeShippingThreshold(e.target.value)
                  }
                  placeholder="2000"
                />
                <p className="text-xs text-muted-foreground">
                  Orders at or above this amount ship free. Set 0 to
                  disable.
                </p>
              </div>

              <div className="space-y-2">
                <Label>COD Note</Label>
                <Input
                  value={codNote}
                  onChange={(e) => setCodNote(e.target.value)}
                  placeholder="Order by phone on WhatsApp and pay on delivery."
                />
                <p className="text-xs text-muted-foreground">
                  Shown in the footer contact box. Empty hides it.
                </p>
              </div>

              <div className="space-y-2">
                <Label>Featured Products Count</Label>
                <Input
                  type="number"
                  min={1}
                  max={20}
                  value={featuredProductCount}
                  onChange={(e) => setFeaturedProductCount(e.target.value)}
                  placeholder="4"
                />
                <p className="text-xs text-muted-foreground">
                  Number of featured products shown on the homepage (1–20).
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Topbar Messages (one per line)</Label>
              <Textarea
                value={topbarMessages}
                onChange={(e) => setTopbarMessages(e.target.value)}
                placeholder={"Welcome to Civil Mart\nBuilding materials, tools and hardware…"}
                className="min-h-32"
              />
              <p className="text-xs text-muted-foreground">
                Scrolling marquee in the top dark strip.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Hero Slider</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <input
              ref={heroInput}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={() => {
                if (uploadingSlideId) uploadHeroImage(uploadingSlideId);
              }}
            />

            {heroSlides.length === 0 && (
              <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
                No hero slides yet. Add one below, upload a banner image and
                save. Until then the site shows the default gradient banner.
              </p>
            )}

            {heroSlides.map((slide, index) => (
              <div
                key={slide.id}
                className="rounded-lg border p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <Badge variant="secondary">
                      Slide {index + 1}
                    </Badge>

                    {slide.active ? (
                      <Badge>Active</Badge>
                    ) : (
                      <Badge variant="outline">Hidden</Badge>
                    )}
                  </div>

                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => moveSlide(slide.id, -1)}
                      disabled={index === 0}
                      aria-label="Move up"
                    >
                      <ChevronUp className="h-4 w-4" />
                    </Button>

                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => moveSlide(slide.id, 1)}
                      disabled={index === heroSlides.length - 1}
                      aria-label="Move down"
                    >
                      <ChevronDown className="h-4 w-4" />
                    </Button>

                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeSlide(slide.id)}
                      aria-label="Remove slide"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div className="mt-3 grid gap-4 md:grid-cols-2">
                  <div className="space-y-2 md:col-span-2">
                    <div className="flex items-center justify-between gap-2">
                      <Label>Banner Image (1920x720)</Label>

                      <div className="flex items-center gap-2">
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          disabled={uploadingSlideId !== null}
                          onClick={() => {
                            setUploadingSlideId(slide.id);
                            heroInput.current?.click();
                          }}
                        >
                          <Upload className="mr-1 h-3 w-3" />
                          {uploadingSlideId === slide.id
                            ? "Uploading..."
                            : "Upload Image"}
                        </Button>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      {slide.imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={slide.imageUrl}
                          alt="Hero preview"
                          className="h-20 w-40 rounded-md border object-cover"
                        />
                      ) : (
                        <div className="flex h-20 w-40 items-center justify-center rounded-md border bg-muted text-muted-foreground">
                          <ImagePlus className="h-6 w-6" />
                        </div>
                      )}

                      <Input
                        value={slide.imageUrl}
                        onChange={(e) =>
                          updateSlide(slide.id, "imageUrl", e.target.value)
                        }
                        placeholder="https://res.cloudinary.com/..."
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Heading</Label>
                    <Input
                      value={slide.heading}
                      onChange={(e) =>
                        updateSlide(slide.id, "heading", e.target.value)
                      }
                      placeholder="New arrivals in store"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Subheading</Label>
                    <Input
                      value={slide.subheading}
                      onChange={(e) =>
                        updateSlide(slide.id, "subheading", e.target.value)
                      }
                      placeholder="Optional supporting text"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Button Text</Label>
                    <Input
                      value={slide.cta}
                      onChange={(e) =>
                        updateSlide(slide.id, "cta", e.target.value)
                      }
                      placeholder="Shop now"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Button Link</Label>
                    <Input
                      value={slide.href}
                      onChange={(e) =>
                        updateSlide(slide.id, "href", e.target.value)
                      }
                      placeholder="/products"
                    />
                  </div>

                  <div className="flex items-end md:col-span-2">
                    <label className="flex cursor-pointer items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={slide.active}
                        onChange={(e) =>
                          updateSlide(slide.id, "active", e.target.checked)
                        }
                        className="h-4 w-4 rounded border-input accent-amber-600"
                      />
                      Show this slide on the homepage
                    </label>
                  </div>
                </div>
              </div>
            ))}

            <Button variant="outline" onClick={addSlide}>
              <Plus className="mr-2 h-4 w-4" />
              Add Slide
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Footer Call to Action</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-xs text-muted-foreground">
            Shown above the footer on the homepage. Leave heading empty to hide
            the section.
          </p>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2 md:col-span-2">
              <Label>Heading</Label>
              <Input
                value={ctaHeading}
                onChange={(e) => setCtaHeading(e.target.value)}
                placeholder="Need help with your order?"
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label>Description</Label>
              <Input
                value={ctaDescription}
                onChange={(e) => setCtaDescription(e.target.value)}
                placeholder="Call our helpline or chat with us on WhatsApp..."
              />
            </div>

            <div className="space-y-2">
              <Label>Primary Button Text</Label>
              <Input
                value={ctaButtonText}
                onChange={(e) => setCtaButtonText(e.target.value)}
                placeholder="Call Now"
              />
            </div>

            <div className="space-y-2">
              <Label>Primary Button Link</Label>
              <Input
                value={ctaButtonHref}
                onChange={(e) => setCtaButtonHref(e.target.value)}
                placeholder="tel:"
              />
            </div>

            <div className="space-y-2">
              <Label>Secondary Button Text</Label>
              <Input
                value={ctaSecondaryText}
                onChange={(e) => setCtaSecondaryText(e.target.value)}
                placeholder="Browse Products"
              />
            </div>

            <div className="space-y-2">
              <Label>Secondary Button Link</Label>
              <Input
                value={ctaSecondaryHref}
                onChange={(e) => setCtaSecondaryHref(e.target.value)}
                placeholder="/products"
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}