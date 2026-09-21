import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { API_ENDPOINTS, TOKEN_KEY, MAX_AGE } from "@/constants/config";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const response = await fetch(API_ENDPOINTS.BACKEND.AUTH.OTP_VERIFY, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(data, { status: response.status });
    }

    if (data.token) {
      const cookieJar = await cookies();
      cookieJar.set(TOKEN_KEY, data.token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: MAX_AGE,
      });
    }

    return NextResponse.json({
      message: data.message,
      user: data.user,
      token: data.token,
    });
  } catch (error) {
    console.error("OTP verify error:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred." },
      { status: 500 },
    );
  }
}
