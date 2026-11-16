import { cookies } from "next/headers";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { TOKEN_KEY, MAX_AGE } from "@/constants/config";

export async function POST(req: NextRequest) {
  try {
    const { token } = await req.json();

    if (!token || typeof token !== "string") {
      return NextResponse.json({ error: "Token is required" }, { status: 400 });
    }

    const cookieJar = await cookies();
    cookieJar.set(TOKEN_KEY, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      path: "/",
      sameSite: "lax",
      maxAge: MAX_AGE,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Session sync error:", error);
    return NextResponse.json(
      { error: "Failed to persist auth session" },
      { status: 500 },
    );
  }
}
