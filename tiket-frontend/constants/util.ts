import { CDN_URL } from "./config";

export const TRANSPARENT_BG = "trnsp";

export const getFullImageUrl = (src?: string | null): string => {
  if (!src) return "";
  if (
    src.startsWith("http://") ||
    src.startsWith("https://") ||
    src.startsWith("blob:") ||
    src.startsWith("data:")
  ) {
    return src;
  }
  const base = (
    CDN_URL ||
    process.env.NEXT_PUBLIC_CDN_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    ""
  ).replace(/\/+$/, "");
  return base ? `${base}/${src.replace(/^\/+/, "")}` : `/${src.replace(/^\/+/, "")}`;
};
