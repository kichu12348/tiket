"use client";
import { getErrorMessage } from "@/lib/errors";

import { useState, useRef } from "react";

import Link from "next/link";
import {
  ImagePlus,
  MapPin,
  Users,
  CheckCircle,
  Type,
  CalendarClock,
  CalendarCheck,
  ChevronLeft,
} from "lucide-react";
import styles from "./Details.module.css";
import { getSignedUrl, uploadToCDN, updateEvent } from "@/api/events";
import { getBackgroundColor } from "@/lib/color";

// Custom components
// Custom components
import DateRangeBlock from "@/components/DateRangeBlock";
import FontPicker from "@/components/FontPicker";
import ColorPicker from "@/components/ColorPicker";
import LocationPicker from "@/components/LocationPicker";
import DescriptionModal from "@/components/DescriptionModal";
import DOMPurify from "isomorphic-dompurify";

import Switch from "@/components/Switch";
import { toast } from "sonner";
import { validateEventPayload } from "@/lib/validators/event";
import { useEventStore } from "@/store/useEventStore";
import Image from "@/components/Image";
import { getImageUrl } from "@/constants/config";
import { TRANSPARENT_BG } from "@/constants/util";
import type { Event, LocationDetails } from "@/types/event";

function DetailsForm({ event }: { event: Event }) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { updateEventLocally } = useEventStore();

  // State
  const [bgColor, setBgColor] = useState<string>(event.color || "");
  const [coverImageUrl, setCoverImageUrl] = useState<string>(
    event.coverImage ? getImageUrl(event.coverImage) : "",
  );
  const [coverImageFile, setCoverImageFile] = useState<File | null>(null);
  const [title, setTitle] = useState(event.title);
  const [titleFont, setTitleFont] = useState(event.fontFamily);

  // Date/Time State
  const [startDate, setStartDate] = useState(event.startDate);
  const [endDate, setEndDate] = useState(event.endDate);
  const [timezone, setTimezone] = useState(event.timezone);

  // Registration Date/Time State
  const [regStartDate, setRegStartDate] = useState(
    event.registrationStart || event.startDate,
  );
  const [regEndDate, setRegEndDate] = useState(
    event.registrationEnd || event.startDate,
  );

  const [locationType, setLocationType] = useState<
    "online" | "offline" | "hybrid"
  >(event.locationType);
  const [locationDetails, setLocationDetails] =
    useState<LocationDetails | null>(event.locationDetails);
  const [virtualLink, setVirtualLink] = useState(
    event.locationDetails?.link || "",
  );
  const [description, setDescription] = useState(event.description || "");
  const [isDescModalOpen, setIsDescModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [requireApproval, setRequireApproval] = useState(event.requireApproval);
  const [capacity, setCapacity] = useState(event.capacity?.toString() || "");

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error("Image size must be less than 5MB");
        return;
      }
      setCoverImageFile(file);
      const url = URL.createObjectURL(file);
      setCoverImageUrl(url);

      getBackgroundColor(url)
        .then((color) => {
          setBgColor(color.hex());
        })
        .catch((e) => {
          console.error("Error extracting color:", e);
        });
    }
  };

  const handleResetBgColor = () => {
    getBackgroundColor(coverImageUrl)
      .then((color) => {
        setBgColor(color.hex());
      })
      .catch((e) => {
        console.error("Error extracting color:", e);
        toast.error("Failed to extract background color. Please try again.");
      });
  };

  const handleSave = async () => {
    if (!event) return;

    try {
      setIsSubmitting(true);

      const validationError = validateEventPayload({
        title,
        startDate,
        endDate,
        regStartDate,
        regEndDate,
        capacity,
      });

      if (validationError) {
        toast.error(validationError);
        setIsSubmitting(false);
        return;
      }

      let finalLocationDetails: LocationDetails | null =
        locationDetails || null;
      if (locationType === "online") {
        finalLocationDetails = {
          link: virtualLink,
        };
      } else if (locationType === "hybrid") {
        finalLocationDetails = {
          ...(locationDetails || {}),
          link: virtualLink,
        };
      }

      let finalCoverImage = event.coverImage;

      if (coverImageFile) {
        toast.info("Uploading cover image...");
        try {
          const { url: signedUrl, max_size } = await getSignedUrl(
            coverImageFile.name,
            coverImageFile.type.split("/")[1],
          );

          if (coverImageFile.size / 1024 / 1024 > max_size) {
            toast.error(`Image size must be less than ${max_size}MB`);
            setIsSubmitting(false);
            return;
          }

          const { filename } = await uploadToCDN(signedUrl, coverImageFile);
          finalCoverImage = filename;
        } catch (err) {
          console.error("Failed to upload image to CDN:", err);
          toast.error("Failed to upload cover image. Please try again.");
          setIsSubmitting(false);
          return;
        }
      }

      const payload = {
        title: title || "Untitled Event",
        description,
        coverImage: finalCoverImage,
        locationType,
        locationDetails: finalLocationDetails,
        startDate,
        endDate,
        timezone,
        registrationStart: regStartDate,
        registrationEnd: regEndDate,
        fontFamily: titleFont,
        requireApproval,
        capacity: capacity ? parseInt(capacity, 10) : null,
        color: bgColor,
      };

      const updated = await updateEvent(event.id, payload);
      updateEventLocally(updated);
      toast.success("Event updated successfully!");
      setCoverImageFile(null);
      // Don't auto navigate away, keep them on the edit page so they can keep making changes if needed
    } catch (error: unknown) {
      console.error("Error updating event:", error);
      toast.error(
        getErrorMessage(error) || "An error occurred while saving the event.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!event) return null;

  return (
    <div
      className={styles.page}
      style={
        bgColor && bgColor !== TRANSPARENT_BG
          ? ({ "--dynamic-bg": bgColor } as React.CSSProperties)
          : {}
      }
    >
      <div className={styles.header}>
        <Link href={`/edit/${event.id}/overview`} className={styles.backBtn}>
          <ChevronLeft size={18} />
          Back to Dashboard
        </Link>
      </div>

      <div className={styles.container}>
        {/* Left Pane */}
        <div className={styles.leftPane}>
          <div
            className={styles.imageUploadBlock}
            onClick={() => fileInputRef.current?.click()}
            style={{ borderWidth: coverImageUrl ? "0px" : "1px" }}
          >
            {coverImageUrl ? (
              <div
                style={{ width: "100%", height: "100%", position: "relative" }}
              >
                {coverImageFile ? (
                  <img
                    src={coverImageUrl}
                    alt="Cover Preview"
                    className={styles.uploadedImage}
                  />
                ) : (
                  <Image
                    alt="Event cover"
                    src={coverImageUrl}
                    className={styles.uploadedImage}
                  />
                )}
              </div>
            ) : (
              <div className={styles.uploadIconWrapper}>
                <ImagePlus size={32} strokeWidth={1.5} />
                <span style={{ fontSize: "0.9rem" }}>Add Cover Image</span>
              </div>
            )}
            <input
              type="file"
              accept="image/*"
              ref={fileInputRef}
              className={styles.hiddenInput}
              onChange={handleImageUpload}
            />
          </div>

          <FontPicker value={titleFont} onChange={setTitleFont} />
          <ColorPicker
            value={bgColor}
            onChange={setBgColor}
            reset={handleResetBgColor}
          />
        </div>

        {/* Right Pane */}
        <div className={styles.rightPane}>
          <input
            type="text"
            placeholder="Event Name"
            className={styles.titleInput}
            style={{ fontFamily: titleFont }}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />

          {/* Event Date & Time */}
          <div className={styles.sectionLabel}>
            <CalendarClock size={15} strokeWidth={1.8} />
            <span>Event Date & Time</span>
          </div>
          <DateRangeBlock
            startDate={startDate}
            endDate={endDate}
            timezone={timezone}
            onStartDateChange={setStartDate}
            onEndDateChange={setEndDate}
            onTimezoneChange={setTimezone}
          />

          {/* Registration Period */}
          <div className={styles.sectionLabel}>
            <CalendarCheck size={15} strokeWidth={1.8} />
            <span>Registration Period</span>
          </div>
          <DateRangeBlock
            startDate={regStartDate}
            endDate={regEndDate}
            timezone={timezone}
            onStartDateChange={setRegStartDate}
            onEndDateChange={setRegEndDate}
            onTimezoneChange={setTimezone}
            timezonePickerDisabled={true}
          />

          {/* Location Block */}
          <div className={styles.sectionLabel}>
            <MapPin size={15} strokeWidth={1.8} />
            <span>Location</span>
          </div>
          <div className={styles.formBlock}>
            <div style={{ padding: "1rem" }}>
              <LocationPicker
                locationType={locationType}
                locationDetails={locationDetails}
                virtualLink={virtualLink}
                onChangeLocationType={setLocationType}
                onChangeLocationDetails={setLocationDetails}
                onChangeVirtualLink={setVirtualLink}
              />
            </div>
          </div>

          {/* Description Block */}
          <div className={styles.sectionLabel}>
            <Type size={15} strokeWidth={1.8} />
            <span>Description</span>
          </div>
          <div className={styles.formBlock}>
            <div
              className={styles.subInput}
              style={{
                minHeight: "60px",
                cursor: "pointer",
                display: "flex",
                alignItems: "flex-start",
                padding: "1rem",
                color: description
                  ? "var(--text-primary)"
                  : "var(--text-muted)",
                whiteSpace: "pre-wrap",
                wordBreak: "break-word",
              }}
              onClick={() => setIsDescModalOpen(true)}
            >
              {description ? (
                <div
                  className="prose"
                  dangerouslySetInnerHTML={{
                    __html: DOMPurify.sanitize(description),
                  }}
                />
              ) : (
                "Write something..."
              )}
            </div>
          </div>

          <span className={styles.optionsHeader}>Event Options</span>

          <div className={styles.formBlock}>
            <div className={styles.optionRow}>
              <div className={styles.iconCol}>
                <CheckCircle size={18} />
              </div>
              <div className={styles.optionGroup}>
                <span className={styles.label}>Require Approval</span>
                <Switch
                  checked={requireApproval}
                  onChange={setRequireApproval}
                />
              </div>
            </div>

            <div className={styles.optionRow}>
              <div className={styles.iconCol}>
                <Users size={18} />
              </div>
              <div className={styles.optionGroup}>
                <span className={styles.label}>Capacity</span>
                <input
                  type="number"
                  className={styles.valueInput}
                  placeholder="Unlimited"
                  value={capacity}
                  onChange={(e) => setCapacity(e.target.value)}
                  min="1"
                />
              </div>
            </div>
          </div>

          <button
            className={styles.createBtn}
            onClick={handleSave}
            disabled={isSubmitting}
            style={{ marginTop: "1rem" }}
          >
            {isSubmitting ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>

      <DescriptionModal
        isOpen={isDescModalOpen}
        initialValue={description}
        onClose={() => setIsDescModalOpen(false)}
        onSave={(val) => setDescription(val)}
      />
    </div>
  );
}

export default function EditDetailsPage() {
  const event = useEventStore((state) => state.event);
  return event ? <DetailsForm key={event.id} event={event} /> : null;
}
