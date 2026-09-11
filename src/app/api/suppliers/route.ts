import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const suppliers = await prisma.supplier.findMany({
      orderBy: {
        name: "asc",
      },
    });

    return NextResponse.json({
      success: true,
      data: suppliers,
    });
  } catch (error) {
    console.error("Failed to fetch suppliers:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch suppliers",
      },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const {
      name,
      contactName,
      phone,
      email,
      address,
      notes,
    } = body;

    if (!name?.trim()) {
      return NextResponse.json(
        {
          success: false,
          error: "Supplier name is required",
        },
        { status: 400 }
      );
    }

    const supplier = await prisma.supplier.create({
      data: {
        name: name.trim(),
        contactName: contactName?.trim() || null,
        phone: phone?.trim() || null,
        email: email?.trim() || null,
        address: address?.trim() || null,
        notes: notes?.trim() || null,
      },
    });

    return NextResponse.json(
      {
        success: true,
        data: supplier,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Failed to create supplier:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Failed to create supplier",
      },
      { status: 500 }
    );
  }
}