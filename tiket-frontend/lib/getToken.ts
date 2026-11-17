import { createServerFn } from "@tanstack/react-start";
import { getCookie } from "@tanstack/react-start/server";
import { TOKEN_KEY } from "@/constants/config";

export const getToken = createServerFn({ method: "GET" }).handler(async () => {
  try {
    return getCookie(TOKEN_KEY);
  } catch {
    return undefined;
  }
});
