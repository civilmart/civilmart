import { NextRequest, NextResponse } from "next/server";
import { createHash } from "crypto";
import { getSessionUserOrThrow } from "@/lib/auth";

const MAX_FILE_BYTES = 10 * 1024 * 1024;

const UPLOAD_PRESETS: Record<
  string,
  { folder: string; transformation: string }
> = {
  product: {
    folder: "civilmart",
    transformation: "w_1280,h_1280,c_fill,q_auto,f_auto",
  },
  hero: {
    folder: "civilmart/hero",
    transformation: "w_1920,h_720,c_fill,q_auto,f_auto",
  },
  category: {
    folder: "civilmart/categories",
    transformation: "w_640,h_360,c_fill,q_auto,f_auto",
  },
  logo: {
    folder: "civilmart/logo",
    transformation: "w_400,h_120,c_fit,q_auto,f_auto",
  },
  favicon: {
    folder: "civilmart/favicon",
    transformation: "w_512,h_512,c_fill,q_auto,f_auto",
  },
};

function getCloudinaryConfig() {
  const raw = process.env.CLOUDINARY_URL;

  if (!raw) {
    throw new Error("CLOUDINARY_URL is not configured");
  }

  const parsed = new URL(raw);

  return {
    cloudName: parsed.hostname,
    apiKey: parsed.username,
    apiSecret: parsed.password,
  };
}

export async function POST(request: NextRequest) {
  try {
    await getSessionUserOrThrow();

    let cloud: ReturnType<typeof getCloudinaryConfig>;

    try {
      cloud = getCloudinaryConfig();
    } catch {
      return NextResponse.json(
        { error: "Cloudinary is not configured on the server" },
        { status: 500 }
      );
    }

    const formData = await request.formData();
    const file = formData.get("file");
    const purpose = String(formData.get("purpose") || "product");

    const preset = UPLOAD_PRESETS[purpose] ?? UPLOAD_PRESETS.product;

    if (!file || typeof file === "string") {
      return NextResponse.json(
        { error: "No file was uploaded" },
        { status: 400 }
      );
    }

    const bytes = Buffer.from(await file.arrayBuffer());

    if (bytes.length === 0) {
      return NextResponse.json(
        { error: "Uploaded file is empty" },
        { status: 400 }
      );
    }

    if (bytes.length > MAX_FILE_BYTES) {
      return NextResponse.json(
        { error: "Image must be 10 MB or smaller" },
        { status: 400 }
      );
    }

    const timestamp = Math.floor(Date.now() / 1000);
    const publicId = `product-${Date.now()}-${Math.random()
      .toString(36)
      .slice(2, 8)}`;

    // Signed params: sorted alphabetically, then hashed with the API secret.
    const params: Record<string, string> = {
      folder: preset.folder,
      public_id: publicId,
      timestamp: String(timestamp),
      transformation: preset.transformation,
    };

    const sortedKeys = Object.keys(params).sort();
    const toSign = sortedKeys
      .map((key) => `${key}=${params[key]}`)
      .join("&");

    const signature = createHash("sha1")
      .update(toSign + cloud.apiSecret)
      .digest("hex");

    const body = new FormData();
    body.append(
      "file",
      new Blob([bytes], { type: file.type || "image/jpeg" }),
      file.name || "upload.jpg"
    );
    body.append("api_key", cloud.apiKey);
    body.append("timestamp", String(timestamp));
    body.append("signature", signature);
    body.append("folder", preset.folder);
    body.append("public_id", publicId);
    body.append("transformation", params.transformation);

    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${cloud.cloudName}/image/upload`,
      { method: "POST", body }
    );

    const data = await response.json();

    if (!response.ok || !data.secure_url) {
      console.error("Cloudinary upload failed:", data);

      return NextResponse.json(
        { error: data?.error?.message || "Upload to Cloudinary failed" },
        { status: 502 }
      );
    }

    return NextResponse.json({ url: data.secure_url });
  } catch (error) {
    console.error("Upload error:", error);

    return NextResponse.json(
      { error: "Failed to upload image" },
      { status: 500 }
    );
  }
}