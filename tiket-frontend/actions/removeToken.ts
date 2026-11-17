import { createServerFn } from "@tanstack/react-start";
import { deleteCookie } from "@tanstack/react-start/server";
import { TOKEN_KEY } from "@/constants/config";

export const removeTokenServer = createServerFn({ method: "POST" }).handler(
  async () => {
    try {
      deleteCookie(TOKEN_KEY);
    } catch (error) {
      console.error("Error deleting auth cookie:", error);
    }
  },
);

export const removeToken = removeTokenServer;
