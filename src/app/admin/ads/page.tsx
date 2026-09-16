"use client";

import { useEffect, useRef, useState } from "react";
import {
  ArrowUpRight,
  Code,
  ImagePlus,
  Megaphone,
  Pencil,
  Plus,
  Trash2,
  Type,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AD_SIZES,
  AD_SLOTS,
  AD_SLOT_LABELS,
  type AdContentType,
  type AdSlot,
  type AdSize,
} from "@/lib/ads";
import { toast } from "sonner";

type AdItem = {
  id: string;
  slot: string;
  title: string;
  subtitle: string | null;
  imageUrl: string | null;
  href: string | null;
  contentType: string;
  embedCode: string | null;
  adSize: string;
  active: boolean;
  sortOrder: number;
};

type AdForm = {
  id: string | null;
  slot: AdSlot;
  title: string;
  subtitle: string;
  href: string;
  imageUrl: string;
  contentType: AdContentType;
  embedCode: string;
  adSize: AdSize;
  sortOrder: string;
  active: boolean;
};

const emptyForm: AdForm = {
  id: null,
  slot: "HOME_BANNER",
  title: "",
  subtitle: "",
  href: "",
  imageUrl: "",
  contentType: "IMAGE",
  embedCode: "",
  adSize: "FULL_WIDTH",
  sortOrder: "0",
  active: true,
};

function slotLabel(value: string): string {
  return AD_SLOT_LABELS[value as AdSlot] ?? value;
}

const CONTENT_TABS: { value: AdContentType; label: string; icon: typeof Megaphone }[] = [
  { value: "IMAGE", label: "Image", icon: ImagePlus },
  { value: "TEXT", label: "Text", icon: Type },
  { value: "EMBED", label: "Embed Code", icon: Code },
];

export default function AdsPage() {
  const [ads, setAds] = useState<AdItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<AdForm>({ ...emptyForm });
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const imageInput = useRef<HTMLInputElement>(null);

  async function fetchAdsList(): Promise<AdItem[]> {
    const response = await fetch("/api/ads");
    const data = await response.json();
    return response.ok && data.success ? (data.data as AdItem[]) : [];
  }

  useEffect(() => {
    let cancelled = false;
    async function init() {
      const list = await fetchAdsList();
      if (cancelled) return;
      setAds(list);
      setLoading(false);
    }
    init();
    return () => { cancelled = true; };
  }, []);

  function startCreate() {
    setForm({ ...emptyForm });
    setShowForm(true);
  }

  function startEdit(ad: AdItem) {
    setForm({
      id: ad.id,
      slot: (AD_SLOTS.some((s) => s.value === ad.slot) ? ad.slot : "HOME_BANNER") as AdSlot,
      title: ad.title,
      subtitle: ad.subtitle ?? "",
      href: ad.href ?? "",
      imageUrl: ad.imageUrl ?? "",
      contentType: (["IMAGE", "TEXT", "EMBED"].includes(ad.contentType) ? ad.contentType : "IMAGE") as AdContentType,
      embedCode: ad.embedCode ?? "",
      adSize: (AD_SIZES.some((s) => s.value === ad.adSize) ? ad.adSize : "FULL_WIDTH") as AdSize,
      sortOrder: String(ad.sortOrder),
      active: ad.active,
    });
    setShowForm(true);
  }

  function uploadFile(onUrl: (url: string) => void) {
    const file = imageInput.current?.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);
    formData.append("purpose", "hero");

    setUploading(true);

    fetch("/api/upload", { method: "POST", body: formData })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Upload failed.");
        return data.url as string;
      })
      .then((url) => onUrl(url))
      .catch((error) => {
        console.error(error);
        toast.error(error.message || "Upload failed.");
      })
      .finally(() => {
        setUploading(false);
        if (imageInput.current) imageInput.current.value = "";
      });
  }

  async function saveAd() {
    if (!form.title.trim()) {
      toast.error("Title is required.");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        slot: form.slot,
        title: form.title.trim(),
        subtitle: form.subtitle.trim() || null,
        href: form.href.trim() || null,
        imageUrl: form.contentType === "IMAGE" ? form.imageUrl.trim() || null : null,
        contentType: form.contentType,
        embedCode: form.contentType === "EMBED" ? form.embedCode.trim() || null : null,
        adSize: form.adSize,
        sortOrder: Number(form.sortOrder) || 0,
        active: form.active,
      };

      const response = await fetch(
        form.id ? `/api/ads/${form.id}` : "/api/ads",
        {
          method: form.id ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );

      const data = await response.json();
      if (!response.ok) {
        toast.error(data.error || "Failed to save ad.");
        return;
      }
      setShowForm(false);
      const list = await fetchAdsList();
      setAds(list);
    } catch (error) {
      console.error(error);
      toast.error("Failed to save ad.");
    } finally {
      setSaving(false);
    }
  }

  async function deleteAd(id: string) {
    if (!window.confirm("Delete this ad permanently?")) return;
    setDeletingId(id);
    try {
      const response = await fetch(`/api/ads/${id}`, { method: "DELETE" });
      if (!response.ok) {
        toast.error("Failed to delete ad.");
        return;
      }
      setAds((current) => current.filter((ad) => ad.id !== id));
    } catch (error) {
      console.error(error);
      toast.error("Failed to delete ad.");
    } finally {
      setDeletingId(null);
    }
  }

  async function toggleActive(ad: AdItem) {
    setAds((current) =>
      current.map((item) =>
        item.id === ad.id ? { ...item, active: !item.active } : item
      )
    );
    try {
      const response = await fetch(`/api/ads/${ad.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: !ad.active }),
      });
      if (!response.ok) {
        toast.error("Failed to update ad.");
        const list = await fetchAdsList();
        setAds(list);
      }
    } catch (error) {
      console.error(error);
      toast.error("Failed to update ad.");
    }
  }

  function contentBadge(ct: string) {
    if (ct === "EMBED") return <Badge variant="secondary">Embed</Badge>;
    if (ct === "TEXT") return <Badge variant="secondary">Text</Badge>;
    return null;
  }

  return (
    <div className="space-y-6 p-6 lg:p-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Megaphone className="h-6 w-6" />
            <h1 className="text-2xl font-bold">Ads &amp; Banners</h1>
          </div>
          <p className="text-muted-foreground">
            Place promotion banners on the storefront. Support images, text overlays, or pasted embed codes.
          </p>
        </div>

        <Button onClick={startCreate}>
          <Plus className="mr-2 h-4 w-4" />
          New Ad
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Placements</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-12 text-center text-muted-foreground">Loading ads...</div>
          ) : ads.length === 0 ? (
            <div className="py-12 text-center">
              <p className="font-medium text-foreground">No ads yet.</p>
              <p className="mb-4 text-sm text-muted-foreground">
                Add your first banner to highlight a promotion or category.
              </p>
              <Button onClick={startCreate}>
                <Plus className="mr-2 h-4 w-4" />
                Add your first ad
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left">
                    <th className="pb-2 pr-4 font-medium text-muted-foreground">Ad</th>
                    <th className="pb-2 pr-4 font-medium text-muted-foreground">Slot</th>
                    <th className="pb-2 pr-4 font-medium text-muted-foreground">Type</th>
                    <th className="pb-2 pr-4 font-medium text-muted-foreground">Size</th>
                    <th className="pb-2 pr-4 font-medium text-muted-foreground">Order</th>
                    <th className="pb-2 pr-4 font-medium text-muted-foreground">Status</th>
                    <th className="pb-2 font-medium text-muted-foreground"></th>
                  </tr>
                </thead>
                <tbody>
                  {ads.map((ad) => (
                    <tr key={ad.id} className="border-b last:border-0">
                      <td className="py-3 pr-4">
                        <div className="flex items-center gap-3">
                          {ad.contentType === "EMBED" ? (
                            <div className="flex h-12 w-20 items-center justify-center rounded-md bg-muted">
                              <Code className="h-4 w-4 text-muted-foreground" />
                            </div>
                          ) : ad.imageUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={ad.imageUrl}
                              alt={ad.title}
                              className="h-12 w-20 rounded-md object-cover"
                            />
                          ) : (
                            <div className="flex h-12 w-20 items-center justify-center rounded-md bg-muted">
                              <Megaphone className="h-4 w-4 text-muted-foreground" />
                            </div>
                          )}
                          <div>
                            <p className="font-medium">{ad.title}</p>
                            {ad.subtitle && (
                              <p className="text-xs text-muted-foreground">{ad.subtitle}</p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="py-3 pr-4">
                        <Badge variant="outline">{slotLabel(ad.slot)}</Badge>
                      </td>
                      <td className="py-3 pr-4">
                        {contentBadge(ad.contentType)}
                      </td>
                      <td className="py-3 pr-4 text-xs text-muted-foreground">
                        {ad.adSize === "FULL_WIDTH" ? "Full" : ad.adSize}
                      </td>
                      <td className="py-3 pr-4 text-muted-foreground">{ad.sortOrder}</td>
                      <td className="py-3 pr-4">
                        <input
                          type="checkbox"
                          checked={ad.active}
                          onChange={() => toggleActive(ad)}
                          className="h-4 w-4 rounded border-input accent-amber-600"
                          title={ad.active ? "Active — click to hide" : "Hidden — click to show"}
                        />
                      </td>
                      <td className="py-3 text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="outline" size="sm" onClick={() => startEdit(ad)}>
                            <Pencil className="mr-2 h-3 w-3" />
                            Edit
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={deletingId === ad.id}
                            onClick={() => deleteAd(ad.id)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{form.id ? "Edit Ad" : "New Ad"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Placement *</Label>
              <select
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={form.slot}
                onChange={(e) =>
                  setForm((c) => ({ ...c, slot: e.target.value as AdSlot }))
                }
              >
                {AD_SLOTS.map((slot) => (
                  <option key={slot.value} value={slot.value}>
                    {slot.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label>Content Type</Label>
              <div className="flex gap-1 rounded-lg border p-1">
                {CONTENT_TABS.map((tab) => {
                  const Icon = tab.icon;
                  return (
                    <button
                      key={tab.value}
                      type="button"
                      onClick={() => setForm((c) => ({ ...c, contentType: tab.value }))}
                      className={`flex flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition ${
                        form.contentType === tab.value
                          ? "bg-primary text-primary-foreground"
                          : "text-muted-foreground hover:bg-muted hover:text-foreground"
                      }`}
                    >
                      <Icon className="h-3.5 w-3.5" />
                      {tab.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Ad Size</Label>
              <select
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={form.adSize}
                onChange={(e) =>
                  setForm((c) => ({ ...c, adSize: e.target.value as AdSize }))
                }
              >
                {AD_SIZES.map((size) => (
                  <option key={size.value} value={size.value}>
                    {size.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label>Title *</Label>
              <Input
                placeholder="e.g. Discount on all cement"
                value={form.title}
                onChange={(e) => setForm((c) => ({ ...c, title: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label>Subtitle</Label>
              <Input
                placeholder="e.g. Flat 5% off this week"
                value={form.subtitle}
                onChange={(e) => setForm((c) => ({ ...c, subtitle: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label>Link (optional)</Label>
              <Input
                placeholder="e.g. /products?category=cement-binding"
                value={form.href}
                onChange={(e) => setForm((c) => ({ ...c, href: e.target.value }))}
              />
            </div>

            {form.contentType === "IMAGE" && (
              <div className="space-y-2">
                <Label>Banner image</Label>
                <input
                  ref={imageInput}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={() =>
                    uploadFile((url) => setForm((c) => ({ ...c, imageUrl: url })))
                  }
                />
                <div className="flex items-center gap-3">
                  {form.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={form.imageUrl}
                      alt="Ad preview"
                      className="h-16 w-28 rounded-md object-cover"
                    />
                  ) : (
                    <div className="flex h-16 w-28 items-center justify-center rounded-md bg-muted">
                      <ImagePlus className="h-5 w-5 text-muted-foreground" />
                    </div>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={uploading}
                    onClick={() => imageInput.current?.click()}
                  >
                    {uploading ? "Uploading..." : "Upload image"}
                  </Button>
                  {form.imageUrl && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setForm((c) => ({ ...c, imageUrl: "" }))}
                    >
                      Remove
                    </Button>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  Wide banner images work best (e.g. 1920 x 720).
                </p>
              </div>
            )}

            {form.contentType === "EMBED" && (
              <div className="space-y-2">
                <Label>Embed Code *</Label>
                <textarea
                  placeholder='Paste your embed code here, e.g. &lt;iframe src="..."&gt;&lt;/iframe&gt;'
                  value={form.embedCode}
                  onChange={(e) => setForm((c) => ({ ...c, embedCode: e.target.value }))}
                  rows={6}
                  className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
                <p className="text-xs text-muted-foreground">
                  Paste an &lt;iframe&gt;, &lt;script&gt;, or any HTML embed code. It will be rendered as-is on the storefront.
                </p>
                {form.embedCode && (
                  <div className="rounded-md border p-2">
                    <p className="mb-1 text-xs font-medium text-muted-foreground">Preview:</p>
                    <div
                      className="overflow-hidden rounded bg-white"
                      style={{
                        width: AD_SIZES.find((s) => s.value === form.adSize)?.width ?? "100%",
                        height: AD_SIZES.find((s) => s.value === form.adSize)?.height ?? "auto",
                        maxWidth: "100%",
                      }}
                      dangerouslySetInnerHTML={{ __html: form.embedCode }}
                    />
                  </div>
                )}
              </div>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Display order</Label>
                <Input
                  type="number"
                  min={0}
                  value={form.sortOrder}
                  onChange={(e) => setForm((c) => ({ ...c, sortOrder: e.target.value }))}
                />
              </div>
              <div className="flex items-end pb-1">
                <label className="flex cursor-pointer items-center gap-2 text-sm font-medium">
                  <input
                    type="checkbox"
                    checked={form.active}
                    onChange={(e) => setForm((c) => ({ ...c, active: e.target.checked }))}
                    className="h-4 w-4 rounded border-input accent-amber-600"
                  />
                  Active
                </label>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Button variant="outline" onClick={() => setShowForm(false)}>
                Cancel
              </Button>
              <Button onClick={saveAd} disabled={saving}>
                {saving ? "Saving..." : form.id ? "Save Changes" : "Add Ad"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {form.href && (
        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <ArrowUpRight className="h-3.5 w-3.5" />
          {form.href}
        </p>
      )}
    </div>
  );
}
