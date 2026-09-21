import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { TOKEN_KEY } from "@/constants/config";

export async function POST() {
  const cookieJar = await cookies();
  cookieJar.delete(TOKEN_KEY);

  return NextResponse.json({ message: "Logged out successfully" });
}
