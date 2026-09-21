"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { FastAverageColor } from "fast-average-color";
import {
  ImagePlus,
  Globe,
  Lock,
  MapPin,
  Users,
  CheckCircle,
  Type,
  CalendarClock,
  CalendarCheck,
} from "lucide-react";
import styles from "./Create.module.css";
import { getSignedUrl, uploadToCDN, createEvent } from "@/api/events";
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
import { randomStr } from "@/lib/utils";
import { CreateEventPayload } from "@/types/event";
import { validateEventPayload } from "@/lib/validators/event";

export default function CreateEventPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

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
  const [locationDetails, setLocationDetails] = useState<any>("");
  const [virtualLink, setVirtualLink] = useState("");
  const [description, setDescription] = useState("");
  const [isDescModalOpen, setIsDescModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [requireApproval, setRequireApproval] = useState(false);
  const [capacity, setCapacity] = useState("");
  const [visibility, setVisibility] = useState<"public" | "private">("public");

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
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

  const handleCreate = async () => {
    try {
      setIsSubmitting(true);

      // --- VALIDATIONS ---
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
      // -------------------

      // let finalLocationDetails = locationDetails;
      // if (locationType === "online") {
      //   finalLocationDetails = virtualLink;
      // } else if (locationType === "hybrid") {
      //   finalLocationDetails = `Physical: ${locationDetails} | Virtual: ${virtualLink}`;
      // }

      let finalCoverImage = null;

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

      const payload: CreateEventPayload = {
        title: title || "Untitled Event",
        description,
        coverImage: finalCoverImage,
        locationType,
        locationDetails:
          locationType === "online" ? { link: virtualLink } : locationDetails,
        startDate,
        endDate,
        timezone,
        registrationStart: regStartDate,
        registrationEnd: regEndDate,
        fontFamily: titleFont,
        requireApproval,
        capacity: capacity ? parseInt(capacity, 10) : null,
        color: bgColor || "#000000",
        status: "draft",
        slug: randomStr(5),
      };

      const res = await createEvent(payload);

      if (res.status === 201) {
        toast.success("Event created successfully!");
        router.push(`/edit/${res.data.id}`);
      } else {
        toast.error("Failed to create event. Please try again.");
      }
    } catch (error: any) {
      console.error("Error creating event:", error);
      const errorMessage =
        error.response?.data?.error ||
        "An error occurred while creating the event.";
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className={styles.page}
      style={
        bgColor ? ({ "--dynamic-bg": bgColor } as React.CSSProperties) : {}
      }
    >
      <div className={styles.container}>
        {/* Left Pane */}
        <div className={styles.leftPane}>
          <div
            className={styles.imageUploadBlock}
            onClick={() => fileInputRef.current?.click()}
            style={{
              borderWidth: coverImageUrl ? "0px" : "1px",
            }}
          >
            {coverImageUrl ? (
              <img
                src={coverImageUrl}
                alt="Cover Preview"
                className={styles.uploadedImage}
              />
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
          <ColorPicker value={bgColor} onChange={setBgColor} />
        </div>

        {/* Right Pane */}
        <div className={styles.rightPane}>
          <div className={styles.topToggles}>
            <div className={styles.togglePill}>
              <Dropdown
                options={[
                  {
                    label: "Public",
                    value: "public",
                    LeftComponent: <Globe size={14} />,
                    desc: "Anyone can find this event",
                  },
                  {
                    label: "Private",
                    value: "private",
                    LeftComponent: <Lock size={14} />,
                    desc: "Only people with the link can register",
                  },
                ]}
                value={visibility}
                onChange={(value) =>
                  setVisibility(value as "public" | "private")
                }
              />
            </div>
          </div>

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
                  ? "var(--color-text-primary)"
                  : "rgba(255, 255, 255, 0.4)",
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
            onClick={handleCreate}
            disabled={isSubmitting}
            style={{ marginTop: "1rem" }}
          >
            {isSubmitting ? "Creating..." : "Create Event"}
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
