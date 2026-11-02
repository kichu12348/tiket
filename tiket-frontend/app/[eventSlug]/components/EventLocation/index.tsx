import React from "react";
import styles from "./EventLocation.module.css";
import type { Event, LocationDetails } from "@/types/event";
import { GOOGLE_MAPS_API_KEY } from "@/constants/config";
import { FiMap } from "react-icons/fi";

interface EventLocationProps {
  event: Event;
  locationData: LocationDetails;
}

export default function EventLocation({
  event,
  locationData,
}: EventLocationProps) {
  if (event.locationType === "online") return null;

  const { name, address, placeId, lat, lng, city, state, country } =
    locationData || {};

  const locationQuery =
    lat && lng
      ? `${lat},${lng}`
      : address
        ? encodeURIComponent(address)
        : name
          ? encodeURIComponent(name)
          : "";

  const googleMapsLink = placeId
    ? `https://www.google.com/maps/search/?api=1&query=${locationQuery || "event"}&query_place_id=${placeId}`
    : locationQuery
      ? `https://www.google.com/maps/search/?api=1&query=${locationQuery}`
      : "#";

  let iframeSrc = "";
  if (GOOGLE_MAPS_API_KEY) {
    if (placeId) {
      iframeSrc = `https://www.google.com/maps/embed/v1/place?key=${GOOGLE_MAPS_API_KEY}&q=place_id:${placeId}`;
    } else if (lat && lng) {
      iframeSrc = `https://www.google.com/maps/embed/v1/view?key=${GOOGLE_MAPS_API_KEY}&center=${lat},${lng}&zoom=15`;
    } else if (address) {
      iframeSrc = `https://www.google.com/maps/embed/v1/place?key=${GOOGLE_MAPS_API_KEY}&q=${encodeURIComponent(address)}`;
    }
  }

  const formattedAddress =
    address ||
    [name, city, state, country].filter(Boolean).join(", ") ||
    "Location details provided upon registration.";

  return (
    <div className={styles.locationSection}>
      <div className={styles.sectionTitle}>Location</div>
      <div className={styles.addressText}>{formattedAddress}</div>
      <div className={styles.mapWrapper}>
        {iframeSrc ? (
          <a
            href={googleMapsLink}
            target="_blank"
            rel="noopener noreferrer"
            style={{ display: "block", width: "100%", height: "100%" }}
          >
            <iframe
              width="100%"
              height="100%"
              style={{ border: 0, pointerEvents: "none" }}
              loading="lazy"
              allowFullScreen
              referrerPolicy="no-referrer-when-downgrade"
              src={iframeSrc}
            ></iframe>
          </a>
        ) : (
          <div className={styles.mapFallback}>
            <FiMap size={24} className={styles.mapFallbackIcon} />
            <span className={styles.mapFallbackText}>
              {googleMapsLink !== "#" ? (
                <a
                  href={googleMapsLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: "inherit", textDecoration: "underline" }}
                >
                  View on Google Maps
                </a>
              ) : (
                "Map Not Available"
              )}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
