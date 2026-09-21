"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
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
import DateRangeBlock from "@/components/DateRangeBlock";
import FontPicker from "@/components/FontPicker";
import ColorPicker from "@/components/ColorPicker";
import LocationPicker from "@/components/LocationPicker";
import DescriptionModal from "@/components/DescriptionModal";
import DOMPurify from "isomorphic-dompurify";
import Dropdown from "@/components/Dropdown";
import Switch from "@/components/Switch";
import { toast } from "sonner";
import { validateEventPayload } from "@/lib/validators/event";
import { useEventStore } from "@/store/useEventStore";
import Image from "@/components/Image";
import { getImageUrl } from "@/constants/config";
import { TRANSPARENT_BG } from "@/constants/util";
import { LocationDetails } from "@/types/event";

export default function EditDetailsPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { event, updateEventLocally } = useEventStore();

  // State
  const [bgColor, setBgColor] = useState<string>("");
  const [coverImageUrl, setCoverImageUrl] = useState<string>("");
  const [coverImageFile, setCoverImageFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [titleFont, setTitleFont] = useState("'Inter', sans-serif");

  // Date/Time State
  const [startDate, setStartDate] = useState(new Date().toISOString());
  const [endDate, setEndDate] = useState(
    new Date(Date.now() + 3600000).toISOString(),
  );
  const [timezone, setTimezone] = useState(
    Intl.DateTimeFormat().resolvedOptions().timeZone,
  );

  // Registration Date/Time State
  const [regStartDate, setRegStartDate] = useState(new Date().toISOString());
  const [regEndDate, setRegEndDate] = useState(
    new Date(Date.now() + 86400000).toISOString(),
  );

  const [locationType, setLocationType] = useState<
    "online" | "offline" | "hybrid"
  >("offline");
  const [locationDetails, setLocationDetails] =
    useState<LocationDetails | null>(null);
  const [virtualLink, setVirtualLink] = useState("");
  const [description, setDescription] = useState("");
  const [isDescModalOpen, setIsDescModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [requireApproval, setRequireApproval] = useState(false);
  const [capacity, setCapacity] = useState("");

  useEffect(() => {
    if (event) {
      setBgColor(event.color || "#000000");
      setCoverImageUrl(getImageUrl(event.coverImage || ""));
      setTitle(event.title || "");
      setTitleFont(event.fontFamily || "'Inter', sans-serif");
      setStartDate(event.startDate || new Date().toISOString());
      setEndDate(event.endDate || new Date(Date.now() + 3600000).toISOString());
      setTimezone(
        event.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone,
      );
      setRegStartDate(event.registrationStart || new Date().toISOString());
      setRegEndDate(
        event.registrationEnd || new Date(Date.now() + 86400000).toISOString(),
      );
      setLocationType(event.locationType || "offline");

      if (event.locationType === "online") {
        setVirtualLink(event.locationDetails?.link || "");
      } else if (event.locationType === "hybrid") {
        setLocationDetails(event.locationDetails || null);
        setVirtualLink(event.locationDetails?.link || "");
      } else {
        setLocationDetails(event.locationDetails || null);
      }

      setDescription(event.description || "");
      setRequireApproval(event.requireApproval || false);
      setCapacity(event.capacity ? event.capacity.toString() : "");
    }
  }, [event]);

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
    } catch (error: any) {
      console.error("Error updating event:", error);
      toast.error(
        error.response?.data?.error ||
          "An error occurred while saving the event.",
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
                  <Image src={coverImageUrl} className={styles.uploadedImage} />
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
