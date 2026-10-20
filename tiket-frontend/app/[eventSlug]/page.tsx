import DOMPurify from "isomorphic-dompurify";
import styles from "./EventPage.module.css";
import { notFound } from "next/navigation";
import { cookies } from "next/headers";
import { getImageUrl, TOKEN_KEY } from "@/constants/config";
import { FiMapPin } from "react-icons/fi";
import { getEventBySlug, getMe } from "./api/eventApi";
import { formatEventDates } from "./utils/formatters";
import RegistrationCard from "./components/RegistrationCard";
import EventLocation from "./components/EventLocation";
import { FiArrowUpRight } from "react-icons/fi";
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

  const user = token ? await getMe(token) : null;
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

  return (
    <div
      className={styles.pageWrapper}
      style={
        {
          "--event-bg": customBg,
          "--event-font": event.fontFamily,
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
              <div className={styles.hostAvatar}></div>
              <div className={styles.hostDetails}>
                <span className={styles.hostedByLabel}>Hosted by</span>
                <span className={styles.hostName}>The Host</span>
              </div>
            </div>
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
            />

            {/* About Section */}
            <div className={styles.aboutSection}>
              <div className={styles.sectionTitle}>About</div>
              <div
                className={`${styles.aboutContent} prose prose-invert`}
                dangerouslySetInnerHTML={{
                  __html: DOMPurify.sanitize(event.description || "No description provided."),
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
