import type React from "react";
import DOMPurify from "isomorphic-dompurify";
import styles from "./EventPage.module.css";
import { getRouteApi } from "@tanstack/react-router";
import { getImageUrl } from "@/constants/config";
import {
  FiMapPin,
  FiArrowUpRight,
  FiGlobe,
  FiInstagram,
  FiTwitter,
  FiLinkedin,
  FiYoutube,
  FiMessageCircle,
  FiCalendar,
  FiDownload,
} from "react-icons/fi";
import { formatEventDates } from "./utils/formatters";
import { buildGoogleCalendarUrl, buildIcsContent } from "@/lib/calendar";
import RegistrationCard from "./components/RegistrationCard";
import EventLocation from "./components/EventLocation";
import { TRANSPARENT_BG } from "@/constants/util";
import type { EventPageData } from "./api/eventPageServer";

const routeApi = getRouteApi("/$eventSlug/");

export default function EventPage() {
  const data = routeApi.useLoaderData() as EventPageData;
  const { event, user, hosts, availability } = data;
  const isAssociated = Boolean(event.isAssociated);

  const { formattedDate, formattedTime, monthShort, dayNumber } =
    formatEventDates(event.startDate, event.endDate);

  const customBg =
    event.color === TRANSPARENT_BG
      ? "transparent"
      : event.color || "transparent";

  const locationData =
    typeof event.locationDetails === "string"
      ? (() => {
          try {
            return JSON.parse(event.locationDetails);
          } catch {
            return {};
          }
        })()
      : event.locationDetails || {};
  const { city, state, name } = locationData;

  const socialLinksData =
    typeof event.socialLinks === "string"
      ? (() => {
          try {
            return JSON.parse(event.socialLinks);
          } catch {
            return {};
          }
        })()
      : event.socialLinks || {};

  const socialItems = [
    {
      key: "website",
      url: socialLinksData.website,
      label: "Website",
      icon: FiGlobe,
    },
    {
      key: "instagram",
      url: socialLinksData.instagram,
      label: "Instagram",
      icon: FiInstagram,
    },
    {
      key: "twitter",
      url: socialLinksData.twitter,
      label: "X / Twitter",
      icon: FiTwitter,
    },
    {
      key: "linkedin",
      url: socialLinksData.linkedin,
      label: "LinkedIn",
      icon: FiLinkedin,
    },
    {
      key: "youtube",
      url: socialLinksData.youtube,
      label: "YouTube",
      icon: FiYoutube,
    },
    {
      key: "community",
      url: socialLinksData.community,
      label: "Community",
      icon: FiMessageCircle,
    },
  ].filter(
    (
      item,
    ): item is {
      key: string;
      url: string;
      label: string;
      icon: typeof FiGlobe;
    } =>
      Boolean(
        item.url && typeof item.url === "string" && item.url.trim().length > 0,
      ),
  );

  const calendarEvent = {
    title: event.title,
    startDate: event.startDate,
    endDate: event.endDate,
    description: event.description,
    locationDetails: locationData,
    locationType: event.locationType,
    slug: event.slug,
  };
  const googleCalUrl = buildGoogleCalendarUrl(calendarEvent);
  const icsContent = buildIcsContent(calendarEvent);

  return (
    <div
      className={styles.pageWrapper}
      style={
        {
          "--event-bg": customBg,
          "--event-font": event.fontFamily || "'Inter', sans-serif",
          fontFamily: event.fontFamily || "inherit",
        } as React.CSSProperties
      }
    >
      <div className={styles.page}>
        <div className={styles.contentContainer}>
          {/* Left Column */}
          <div className={styles.leftColumn}>
            <div className={styles.posterWrapper}>
              {event.coverImage && (
                <img
                  src={getImageUrl(event.coverImage)}
                  alt=""
                  className={styles.posterGlow}
                  aria-hidden="true"
                />
              )}
              {event.coverImage ? (
                <img
                  src={getImageUrl(event.coverImage)}
                  alt={event.title}
                  className={styles.posterImage}
                />
              ) : (
                <div
                  className={styles.posterImage}
                  style={{ backgroundColor: customBg }}
                />
              )}
            </div>

            <div className={styles.hostSection}>
              {hosts && hosts.length > 0 ? (
                hosts.slice(0, 3).map((host) => (
                  <div
                    key={host.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.75rem",
                    }}
                  >
                    <div
                      className={styles.hostAvatar}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontWeight: 600,
                        fontSize: "0.85rem",
                      }}
                    >
                      {host.name ? host.name.charAt(0).toUpperCase() : "H"}
                    </div>
                    <div className={styles.hostDetails}>
                      <span className={styles.hostedByLabel}>
                        {host.isCreator ? "Creator" : host.role || "Host"}
                      </span>
                      <span className={styles.hostName}>{host.name}</span>
                    </div>
                  </div>
                ))
              ) : (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.75rem",
                  }}
                >
                  <div
                    className={styles.hostAvatar}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontWeight: 600,
                      fontSize: "0.85rem",
                    }}
                  >
                    H
                  </div>
                  <div className={styles.hostDetails}>
                    <span className={styles.hostedByLabel}>Hosted by</span>
                    <span className={styles.hostName}>The Host</span>
                  </div>
                </div>
              )}
            </div>

            {socialItems.length > 0 && (
              <div
                className={styles.socialSection}
                data-testid="event-social-links"
              >
                <div className={styles.socialList}>
                  {socialItems.map(({ key, url, label, icon: Icon }) => (
                    <a
                      key={key}
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={styles.socialLink}
                      aria-label={label}
                      title={label}
                      data-testid={`social-link-${key}`}
                    >
                      <Icon size={16} />
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right Column */}
          <div className={styles.rightColumn}>
            <div className={styles.headerSection}>
              <h1
                className={styles.title}
                style={{ fontFamily: event.fontFamily }}
              >
                {event.title}
              </h1>

              <div className={styles.metaInfo}>
                <div className={styles.metaItem}>
                  <div className={styles.calendarChip}>
                    <span className={styles.calendarMonth}>{monthShort}</span>
                    <span className={styles.calendarDay}>{dayNumber}</span>
                  </div>
                  <div className={styles.metaText}>
                    <span className={styles.metaPrimary}>{formattedDate}</span>
                    <span className={styles.metaSecondary}>
                      {formattedTime}
                    </span>
                  </div>
                </div>

                <a
                  href={
                    locationData.placeId
                      ? `https://www.google.com/maps/search/?api=1&query=${locationData.lat || ""},${locationData.lng || ""}&query_place_id=${locationData.placeId}`
                      : "#"
                  }
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`${styles.metaItem} ${styles.clickableMetaItem}`}
                >
                  <div className={styles.metaIcon}>
                    <FiMapPin size={18} />
                  </div>
                  <div className={styles.metaText}>
                    <span className={styles.metaPrimary}>
                      {event.locationType === "online"
                        ? "Online Event"
                        : name || "Register to See Address"}
                      {event.locationType !== "online" && (
                        <FiArrowUpRight className={styles.linkArrow} />
                      )}
                    </span>
                    {event.locationType !== "online" && (
                      <span className={styles.metaSecondary}>
                        {city}, {state}
                      </span>
                    )}
                  </div>
                </a>
              </div>

              {/* Add to Calendar */}
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: "0.6rem",
                  marginTop: "0.85rem",
                }}
                data-testid="calendar-buttons"
              >
                <a
                  href={googleCalUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  data-testid="add-to-google-calendar-btn"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "0.45rem",
                    background:
                      "var(--color-soft-bg, rgba(255, 255, 255, 0.05))",
                    color: "var(--color-text-soft, rgba(255, 255, 255, 0.75))",
                    padding: "0.45rem 0.85rem",
                    borderRadius: "var(--radius-sm, 8px)",
                    fontSize: "0.82rem",
                    fontWeight: 500,
                    textDecoration: "none",
                  }}
                >
                  <FiCalendar size={14} />
                  <span>Add to Google Calendar</span>
                </a>
                <a
                  href={`data:text/calendar;charset=utf-8,${encodeURIComponent(icsContent)}`}
                  download={`${event.slug || "event"}.ics`}
                  data-testid="download-ics-btn"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "0.45rem",
                    background:
                      "var(--color-soft-bg, rgba(255, 255, 255, 0.05))",
                    color: "var(--color-text-soft, rgba(255, 255, 255, 0.75))",
                    padding: "0.45rem 0.85rem",
                    borderRadius: "var(--radius-sm, 8px)",
                    fontSize: "0.82rem",
                    fontWeight: 500,
                    textDecoration: "none",
                  }}
                >
                  <FiDownload size={14} />
                  <span>Download .ics</span>
                </a>
              </div>
            </div>

            {/* Registration Card Component */}
            <RegistrationCard
              event={event}
              user={user}
              isAssociated={isAssociated}
              availability={availability}
            />

            {/* About Section */}
            <div className={styles.aboutSection}>
              <div className={styles.sectionTitle}>About</div>
              <div
                className={`${styles.aboutContent} prose prose-invert`}
                dangerouslySetInnerHTML={{
                  __html: DOMPurify.sanitize(
                    event.description || "No description provided.",
                  ),
                }}
              />
            </div>

            {/* Location Section Component */}
            <EventLocation event={event} locationData={locationData} />
          </div>
        </div>
      </div>
    </div>
  );
}
