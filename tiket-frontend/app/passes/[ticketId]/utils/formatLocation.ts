import { LocationDetails } from "@/types/ticket";

export function formatLocation(
  locationType?: "online" | "offline" | "hybrid",
  locationDetails?: LocationDetails | string | null
): string {
  if (locationType === "online") {
    return "Online Event";
  }

  let formattedLocation = "";

  if (locationDetails && typeof locationDetails === "object") {
    const name = locationDetails.name?.trim();
    const city = locationDetails.city?.trim();
    const state = locationDetails.state?.trim();

    const placeName = name || (locationDetails.address ? locationDetails.address.split(",")[0]?.trim() : "");
    const region = [city, state].filter(Boolean).join(", ");

    if (placeName && region) {
      formattedLocation = `${placeName}, ${region}`;
    } else if (placeName) {
      formattedLocation = placeName;
    } else if (region) {
      formattedLocation = region;
    } else if (locationDetails.address) {
      // Fallback: taking first 2 address components to avoid bloated address string
      formattedLocation = locationDetails.address
        .split(",")
        .slice(0, 2)
        .map((s) => s.trim())
        .join(", ");
    }
  } else if (typeof locationDetails === "string" && locationDetails.trim()) {
    // If it's a long raw address string, limit to place + region (first 2 comma parts)
    const parts = locationDetails.split(",").map((p) => p.trim());
    formattedLocation = parts.length > 2 ? parts.slice(0, 2).join(", ") : locationDetails;
  }

  if (!formattedLocation) {
    formattedLocation = "Venue TBA";
  }

  if (locationType === "hybrid") {
    return `${formattedLocation} (Hybrid)`;
  }

  return formattedLocation;
}
