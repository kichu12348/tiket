import type { LocationDetails } from "@/types/ticket";

export function formatLocation(
  locationType?: "online" | "offline" | "hybrid",
  locationDetails?: LocationDetails | string | null,
): string {
  if (locationType === "online") {
    return "Online Event";
  }

  let details: LocationDetails | null = null;
  let rawAddressString = "";

  if (locationDetails && typeof locationDetails === "object") {
    details = locationDetails;
  } else if (typeof locationDetails === "string" && locationDetails.trim()) {
    try {
      const parsed = JSON.parse(locationDetails);
      if (parsed && typeof parsed === "object") {
        details = parsed;
      } else {
        rawAddressString = locationDetails;
      }
    } catch {
      rawAddressString = locationDetails;
    }
  }

  let formattedLocation = "";

  if (details) {
    const name = details.name?.trim();
    const city = details.city?.trim();
    const state = details.state?.trim();

    const placeName =
      name ||
      (details.address ? details.address.split(",")[0]?.trim() : "");
    const region = [city, state].filter(Boolean).join(", ");

    if (placeName && region) {
      formattedLocation = `${placeName}, ${region}`;
    } else if (placeName) {
      formattedLocation = placeName;
    } else if (region) {
      formattedLocation = region;
    } else if (details.address) {
      formattedLocation = details.address
        .split(",")
        .slice(0, 2)
        .map((s) => s.trim())
        .join(", ");
    }
  } else if (rawAddressString) {
    const parts = rawAddressString.split(",").map((p) => p.trim());
    formattedLocation =
      parts.length > 2 ? parts.slice(0, 2).join(", ") : rawAddressString;
  }

  if (!formattedLocation) {
    formattedLocation = "Venue TBA";
  }

  if (locationType === "hybrid") {
    return `${formattedLocation} (Hybrid)`;
  }

  return formattedLocation;
}

