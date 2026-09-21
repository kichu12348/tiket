import { NextRequest, NextResponse } from "next/server";
import { API_ENDPOINTS } from "@/constants/config";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const response = await fetch(API_ENDPOINTS.BACKEND.AUTH.OTP_SEND, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(data, { status: response.status });
    }

    return NextResponse.json({ message: data.message });
  } catch (error) {
    console.error("OTP send error:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred." },
      { status: 500 },
    );
  }
}
