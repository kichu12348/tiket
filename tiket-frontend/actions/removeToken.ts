"use server";
import { cookies } from "next/headers";
import { TOKEN_KEY } from "@/constants/config";

export async function removeTokenServer() {
  const cookieJar = await cookies();
  cookieJar.delete(TOKEN_KEY);
}
