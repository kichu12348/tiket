import type { EventSocialLinks } from "@/types/event";

export type SocialPlatform =
  | "website"
  | "instagram"
  | "twitter"
  | "linkedin"
  | "youtube"
  | "community";

export interface EventValidationData {
  title: string;
  startDate: string;
  endDate: string;
  regStartDate: string;
  regEndDate: string;
  capacity?: string | number | null;
  socialLinks?: EventSocialLinks | null;
}

export const normalizeSocialUrl = (
  platform: SocialPlatform,
  rawInput?: string | null,
): string | null => {
  if (!rawInput) return null;
  let val = rawInput.trim();
  if (!val) return null;

  // Reject dangerous schemes
  const sanitizedForScheme = val.replace(/\s+/g, "").toLowerCase();
  if (
    sanitizedForScheme.startsWith("javascript:") ||
    sanitizedForScheme.startsWith("data:") ||
    sanitizedForScheme.startsWith("vbscript:") ||
    sanitizedForScheme.startsWith("file:")
  ) {
    return null;
  }

  // Normalize platform handles
  if (platform === "instagram") {
    if (val.startsWith("@")) {
      val = `https://instagram.com/${val.slice(1)}`;
    } else if (!val.includes("/") && !val.includes(".")) {
      val = `https://instagram.com/${val}`;
    }
  } else if (platform === "twitter") {
    if (val.startsWith("@")) {
      val = `https://x.com/${val.slice(1)}`;
    } else if (!val.includes("/") && !val.includes(".")) {
      val = `https://x.com/${val}`;
    }
  } else if (platform === "youtube") {
    if (val.startsWith("@")) {
      val = `https://youtube.com/${val}`;
    } else if (!val.includes("/") && !val.includes(".")) {
      val = `https://youtube.com/@${val}`;
    }
  } else if (platform === "linkedin") {
    if (!val.includes("/") && !val.includes(".")) {
      val = `https://linkedin.com/in/${val}`;
    }
  }

  // Auto-prefix https:// if missing protocol
  if (!/^https?:\/\//i.test(val)) {
    val = `https://${val}`;
  }

  try {
    const parsed = new URL(val);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return null;
    }
    if (!parsed.hostname || parsed.hostname.length < 1) {
      return null;
    }
    return parsed.toString();
  } catch {
    return null;
  }
};

export const validateSocialUrl = (
  platform: SocialPlatform,
  rawInput?: string | null,
): string | null => {
  if (!rawInput || !rawInput.trim()) return null;
  const normalized = normalizeSocialUrl(platform, rawInput);
  if (!normalized) {
    return `Invalid ${platform} URL or handle.`;
  }
  return null;
};

export const normalizeSocialLinks = (
  links?: EventSocialLinks | null,
): EventSocialLinks => {
  if (!links) return {};
  const result: EventSocialLinks = {};
  const platforms: SocialPlatform[] = [
    "website",
    "instagram",
    "twitter",
    "linkedin",
    "youtube",
    "community",
  ];
  for (const p of platforms) {
    const val = links[p];
    if (val && typeof val === "string" && val.trim()) {
      const normalized = normalizeSocialUrl(p, val);
      if (normalized) {
        result[p] = normalized;
      }
    }
  }
  return result;
};

export const validateEventPayload = (
  data: EventValidationData,
): string | null => {
  if (!data.title.trim()) {
    return "Event title is required.";
  }

  const start = new Date(data.startDate);
  const end = new Date(data.endDate);
  if (end <= start) {
    return "Event end date must be after the start date.";
  }

  const rStart = new Date(data.regStartDate);
  const rEnd = new Date(data.regEndDate);
  if (rEnd <= rStart) {
    return "Registration end date must be after the registration start date.";
  }

  if (rEnd > end) {
    return "Registration cannot end after the event has ended.";
  }

  if (
    data.capacity !== undefined &&
    data.capacity !== null &&
    data.capacity !== ""
  ) {
    const parsedCapacity =
      typeof data.capacity === "string"
        ? parseInt(data.capacity, 10)
        : data.capacity;
    if (isNaN(parsedCapacity) || parsedCapacity <= 0) {
      return "Capacity must be a valid number greater than 0.";
    }
  }

  if (data.socialLinks) {
    const platforms: SocialPlatform[] = [
      "website",
      "instagram",
      "twitter",
      "linkedin",
      "youtube",
      "community",
    ];
    for (const p of platforms) {
      const val = data.socialLinks[p];
      if (val && typeof val === "string" && val.trim()) {
        const error = validateSocialUrl(p, val);
        if (error) return error;
      }
    }
  }

  return null; // Valid
};
