"use server";

import { cookies } from "next/headers";
import { TOKEN_KEY } from "@/constants/config";

export async function getToken(): Promise<string | undefined> {
  const cookieStore = await cookies();
  return cookieStore.get(TOKEN_KEY)?.value;
}
