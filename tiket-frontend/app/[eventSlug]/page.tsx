import DOMPurify from "isomorphic-dompurify";
import styles from "./EventPage.module.css";
import { notFound } from "next/navigation";
import { cookies } from "next/headers";
import { getImageUrl, TOKEN_KEY } from "@/constants/config";
import {
  FiMapPin,
  FiArrowUpRight,
  FiGlobe,
  FiInstagram,
  FiTwitter,
  FiLinkedin,
  FiYoutube,
  FiMessageCircle,
} from "react-icons/fi";
import {
  getEventBySlug,
  getMe,
  getEventHosts,
  getEventAvailability,
} from "./api/eventApi";
import { formatEventDates } from "./utils/formatters";
import RegistrationCard from "./components/RegistrationCard";
import EventLocation from "./components/EventLocation";
import { TRANSPARENT_BG } from "@/constants/util";
import type { Metadata, Viewport } from "next";

interface PageProps {
  params: Promise<{ eventSlug: string }>;
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const resolvedParams = await params;
  const event = await getEventBySlug(resolvedParams.eventSlug);
  if (!event) return { title: "Event Not Found" };
  return {
    title: `${event.title}`,
    description: event.description || "Join this amazing event!",
    openGraph: {
      title: event.title,
      description: event.description || "",
      images: [
        {
          url: getImageUrl(event.coverImage || ""),
          width: 800,
          height: 600,
          alt: event.title,
        },
      ],
    },
  };
}

export async function generateViewport({
  params,
}: PageProps): Promise<Viewport> {
  const resolvedParams = await params;
  const event = await getEventBySlug(resolvedParams.eventSlug);
  if (!event) return { themeColor: "#121316" };
  return {
    themeColor: event.color || "#121316",
  };
}

export default async function EventPage({ params }: PageProps) {
  const resolvedParams = await params;
  const cookieStore = await cookies();
  const token = cookieStore.get(TOKEN_KEY)?.value;

  const event = await getEventBySlug(resolvedParams.eventSlug, token);
  if (!event) return notFound();

  const [user, hosts, availability] = await Promise.all([
    token ? getMe(token) : Promise.resolve(null),
    token ? getEventHosts(event.id, token) : Promise.resolve([]),
    getEventAvailability(event.id),
  ]);
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
    { key: "website", url: socialLinksData.website, label: "Website", icon: FiGlobe },
    { key: "instagram", url: socialLinksData.instagram, label: "Instagram", icon: FiInstagram },
    { key: "twitter", url: socialLinksData.twitter, label: "X / Twitter", icon: FiTwitter },
    { key: "linkedin", url: socialLinksData.linkedin, label: "LinkedIn", icon: FiLinkedin },
    { key: "youtube", url: socialLinksData.youtube, label: "YouTube", icon: FiYoutube },
    { key: "community", url: socialLinksData.community, label: "Community", icon: FiMessageCircle },
  ].filter(
    (item): item is { key: string; url: string; label: string; icon: typeof FiGlobe } =>
      Boolean(item.url && typeof item.url === "string" && item.url.trim().length > 0),
  );

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
