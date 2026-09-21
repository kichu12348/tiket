import React from "react";
import styles from "./EventLocation.module.css";
import { Event } from "@/types/event";
import { GOOGLE_MAPS_API_KEY } from "@/constants/config";
import { FiMap } from "react-icons/fi";

interface EventLocationProps {
  event: Event;
  locationData: {
    address: string;
    placeId?: string;
    lat?: number;
    lng?: number;
    city?: string;
    state?: string;
    country?: string;
  };
}

export default function EventLocation({ event, locationData }: EventLocationProps) {
  if (event.locationType === "online") return null;

  const { address, placeId, lat, lng, state, country } = locationData;

  const locationQuery =
    lat && lng ? `${lat},${lng}` : encodeURIComponent(address);

  const googleMapsLink = placeId
    ? `https://www.google.com/maps/search/?api=1&query=${locationQuery}&query_place_id=${placeId}`
    : `https://www.google.com/maps/search/?api=1&query=${locationQuery}`;

  return (
    <div className={styles.locationSection}>
      <div className={styles.sectionTitle}>Location</div>
      <div className={styles.addressText}>
        {state}, {country}
      </div>
      <div className={styles.mapWrapper}>
        {placeId || (lat && lng) ? (
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
              src={`https://www.google.com/maps/embed/v1/place?key=${GOOGLE_MAPS_API_KEY}&q=place_id:${placeId}`}
            ></iframe>
          </a>
        ) : (
          <div className={styles.mapFallback}>
            <FiMap size={24} className={styles.mapFallbackIcon} />
            <span className={styles.mapFallbackText}>Map Not Available</span>
          </div>
        )}
      </div>
    </div>
  );
}
