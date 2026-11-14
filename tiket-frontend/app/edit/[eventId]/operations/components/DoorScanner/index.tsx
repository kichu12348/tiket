"use client";

import {
  useState,
  useRef,
  useEffect,
  useCallback,
  type FormEvent,
} from "react";
import {
  ScanLine,
  QrCode,
  CheckCircle2,
  X,
  Info,
  Camera,
  CameraOff,
  RotateCcw,
  Clock,
  Keyboard,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { scanTicketCode, toggleManualCheckIn } from "@/api/operations";
import ScanResultCard from "./ScanResultCard";
import { playAudioFeedback } from "./functions/audio";
import type {
  ScanResultItem,
  BarcodeDetectorConstructor,
  BarcodeDetectorInstance,
  DoorScannerProps,
} from "./types";
import styles from "./DoorScanner.module.css";

const getBarcodeDetector = (): BarcodeDetectorConstructor | null => {
  if (typeof window === "undefined") return null;
  const win = window as unknown as {
    BarcodeDetector?: BarcodeDetectorConstructor;
  };
  return win.BarcodeDetector ?? null;
};

export default function DoorScanner({
  eventId = "",
  onScanChange,
  disabled = false,
  scan,
  undoCheckIn,
}: DoorScannerProps) {
  // Mode selection: "manual" or "camera"
  const [mode, setMode] = useState<"manual" | "camera">("manual");

  // Manual code entry state
  const [code, setCode] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUndoing, setIsUndoing] = useState(false);

  // Scan feedback and history
  const [lastResult, setLastResult] = useState<ScanResultItem | null>(null);
  const [recentScans, setRecentScans] = useState<ScanResultItem[]>([]);

  // Camera scanner state
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameras, setCameras] = useState<MediaDeviceInfo[]>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string>("");
  const [cameraError, setCameraError] = useState<string | null>(null);

  // Video and detection refs
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const detectorRef = useRef<BarcodeDetectorInstance | null>(null);
  const lastScanRef = useRef<{ code: string; timestamp: number } | null>(null);

  // Populate available video input devices safely
  useEffect(() => {
    if (
      typeof navigator === "undefined" ||
      !navigator.mediaDevices?.enumerateDevices
    ) {
      return;
    }

    let isMounted = true;
    navigator.mediaDevices
      .enumerateDevices()
      .then((devices) => {
        if (!isMounted) return;
        const videoDevices = devices.filter((d) => d.kind === "videoinput");
        setCameras(videoDevices);
        if (videoDevices.length > 0 && !selectedCameraId) {
          const rearCamera = videoDevices.find((d) => {
            const label = d.label.toLowerCase();
            return (
              label.includes("back") ||
              label.includes("rear") ||
              label.includes("environment")
            );
          });
          setSelectedCameraId(
            rearCamera ? rearCamera.deviceId : videoDevices[0]!.deviceId,
          );
        }
      })
      .catch(() => {
        // Enumerate error ignored in restricted or headless test environments
      });

    return () => {
      isMounted = false;
    };
  }, [selectedCameraId]);

  // Stop camera media stream
  const stopCamera = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsCameraActive(false);
  }, []);

  // Clean up camera stream on unmount
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [stopCamera]);

  // Start camera media stream
  const startCamera = useCallback(async () => {
    setCameraError(null);
    if (
      typeof navigator === "undefined" ||
      !navigator.mediaDevices?.getUserMedia
    ) {
      setCameraError("Camera access is not supported in this environment.");
      return;
    }

    try {
      const constraints: MediaStreamConstraints = {
        video: selectedCameraId
          ? { deviceId: { exact: selectedCameraId } }
          : { facingMode: "environment" },
        audio: false,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => {});
      }
      setIsCameraActive(true);

      // Re-enumerate devices now that camera permission is granted
      const devices = await navigator.mediaDevices
        .enumerateDevices()
        .catch(() => []);
      const videoDevices = devices.filter((d) => d.kind === "videoinput");
      setCameras(videoDevices);
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Unable to access camera.";
      setCameraError(msg);
      setIsCameraActive(false);
    }
  }, [selectedCameraId]);

  // Execute scan check-in logic
  const executeScan = useCallback(
    async (rawCode: string) => {
      const trimmed = rawCode.trim().toUpperCase();
      if (!trimmed || disabled || isSubmitting) return;

      const now = Date.now();
      if (
        lastScanRef.current &&
        lastScanRef.current.code.toUpperCase() === trimmed &&
        now - lastScanRef.current.timestamp < 3000
      ) {
        // Debounce: ignore identical scan within 3 seconds
        return;
      }

      lastScanRef.current = { code: trimmed, timestamp: now };

      try {
        setIsSubmitting(true);
        let resultItem: ScanResultItem;

        if (scan) {
          // Compatibility path for legacy props or tests
          const res = await scan(trimmed);
          const isSuccess = typeof res === "boolean" ? res : (res as { success?: boolean }).success !== false;

          if (isSuccess) {
            const ticketId =
              typeof res === "object" && res !== null
                ? (res as { ticketId?: string; ticket?: { id?: string } })
                    .ticketId ||
                  (res as { ticket?: { id?: string } }).ticket?.id
                : undefined;
            const message =
              (typeof res === "object" &&
                res !== null &&
                (res as { message?: string }).message) ||
              "Attendee checked in.";
            const todayCount =
              typeof res === "object" && res !== null
                ? (res as { todayCheckInCount?: number }).todayCheckInCount
                : 1;
            const totalCount =
              typeof res === "object" && res !== null
                ? (res as { totalCheckIns?: number }).totalCheckIns
                : 1;

            resultItem = {
              id: `scan-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
              ticketId,
              code: trimmed,
              status: "success",
              message,
              todayCheckInCount: todayCount,
              totalCheckIns: totalCount,
              checkInDate: new Date().toISOString().split("T")[0],
              timestamp: new Date().toLocaleTimeString(),
            };
            playAudioFeedback("success");
            setCode("");
          } else {
            const errorMessage =
              (typeof res === "object" &&
                res !== null &&
                (res as { error?: string }).error) ||
              "Ticket is not eligible for this admission change.";
            resultItem = {
              id: `scan-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
              code: trimmed,
              status: "error",
              message: errorMessage,
              timestamp: new Date().toLocaleTimeString(),
            };
            playAudioFeedback("error");
          }
        } else {
          // Direct API call: scanTicketCode(eventId, code)
          const res = await scanTicketCode(eventId, trimmed);
          const ticketObj = res.ticket as
            | {
                id?: string;
                status?: string;
                ticketName?: string;
                ticketType?: { name?: string };
                user?: { name?: string; email?: string };
                attendeeName?: string;
                attendeeEmail?: string;
              }
            | undefined;

          const attendeeName =
            ticketObj?.user?.name ||
            ticketObj?.attendeeName ||
            (res as unknown as { attendee?: { name?: string } })?.attendee
              ?.name ||
            "Attendee";

          const attendeeEmail =
            ticketObj?.user?.email ||
            ticketObj?.attendeeEmail ||
            (res as unknown as { attendee?: { email?: string } })?.attendee
              ?.email;

          const ticketTier =
            ticketObj?.ticketName ||
            ticketObj?.ticketType?.name ||
            "General Admission";

          const ticketId = ticketObj?.id || res.checkIn?.ticketId;

          resultItem = {
            id: `scan-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            ticketId,
            code: trimmed,
            status: "success",
            message: res.message || "Attendee checked in successfully.",
            attendeeName,
            attendeeEmail,
            ticketTier,
            todayCheckInCount: res.todayCheckInCount,
            totalCheckIns: res.totalCheckIns,
            checkInDate: res.checkInDate,
            timestamp: new Date().toLocaleTimeString(),
          };

          playAudioFeedback("success");
          setCode("");
        }

        setLastResult(resultItem);
        setRecentScans((prev) => [resultItem, ...prev.slice(0, 9)]);
        onScanChange?.();
      } catch (err: unknown) {
        let errorMessage = "Ticket admission failed.";
        if (err && typeof err === "object") {
          const axiosErr = err as {
            response?: { data?: { error?: string; message?: string } };
            message?: string;
          };
          if (axiosErr.response?.data?.error) {
            errorMessage = axiosErr.response.data.error;
          } else if (axiosErr.response?.data?.message) {
            errorMessage = axiosErr.response.data.message;
          } else if (axiosErr.message) {
            errorMessage = axiosErr.message;
          }
        }

        const errorItem: ScanResultItem = {
          id: `scan-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          code: trimmed,
          status: "error",
          message: errorMessage,
          timestamp: new Date().toLocaleTimeString(),
        };

        setLastResult(errorItem);
        setRecentScans((prev) => [errorItem, ...prev.slice(0, 9)]);
        playAudioFeedback("error");
      } finally {
        setIsSubmitting(false);
      }
    },
    [disabled, isSubmitting, scan, eventId, onScanChange],
  );

  // 3-second duplicate-scan debounce guard for camera detection
  const handleScannedCodeFromCamera = useCallback(
    (detectedCode: string) => {
      const trimmed = detectedCode.trim().toUpperCase();
      if (!trimmed || isSubmitting) return;

      const now = Date.now();
      if (
        lastScanRef.current &&
        lastScanRef.current.code === trimmed &&
        now - lastScanRef.current.timestamp < 3000
      ) {
        // Debounce: ignore identical scan within 3 seconds
        return;
      }

      lastScanRef.current = { code: trimmed, timestamp: now };
      void executeScan(trimmed);
    },
    [isSubmitting, executeScan],
  );

  // Camera barcode detection loop using native BarcodeDetector
  useEffect(() => {
    if (!isCameraActive) return;

    const DetectorClass = getBarcodeDetector();
    if (DetectorClass && !detectorRef.current) {
      try {
        detectorRef.current = new DetectorClass({ formats: ["qr_code"] });
      } catch {
        detectorRef.current = null;
      }
    }

    let isScanningFrame = true;

    const detectFrame = async () => {
      if (!isScanningFrame) return;

      if (
        videoRef.current &&
        videoRef.current.readyState >= 2 &&
        detectorRef.current
      ) {
        try {
          const barcodes = await detectorRef.current.detect(videoRef.current);
          if (barcodes.length > 0 && barcodes[0]?.rawValue) {
            handleScannedCodeFromCamera(barcodes[0].rawValue);
          }
        } catch {
          // Ignore per-frame detection hiccups
        }
      }

      if (isScanningFrame) {
        animationFrameRef.current = requestAnimationFrame(detectFrame);
      }
    };

    animationFrameRef.current = requestAnimationFrame(detectFrame);

    return () => {
      isScanningFrame = false;
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    };
  }, [isCameraActive, handleScannedCodeFromCamera]);

  // Manual code entry submission
  const handleSubmitManual = async (e: FormEvent) => {
    e.preventDefault();
    await executeScan(code);
  };

  // 1-Click Undo action
  const handleUndo = async (ticketId: string) => {
    if (!ticketId || isUndoing) return;

    try {
      setIsUndoing(true);
      if (undoCheckIn) {
        await undoCheckIn(ticketId);
      } else if (eventId) {
        await toggleManualCheckIn(eventId, ticketId, true);
      }

      // Mark the scan as undone in the lastResult and recentScans list
      setLastResult((prev) =>
        prev && prev.ticketId === ticketId
          ? { ...prev, undone: true, message: `Check-in undone for pass ${prev.code}.` }
          : prev,
      );

      setRecentScans((prev) =>
        prev.map((item) =>
          item.ticketId === ticketId ? { ...item, undone: true } : item,
        ),
      );

      onScanChange?.();
    } finally {
      setIsUndoing(false);
    }
  };

  const hasBarcodeDetector = typeof window !== "undefined" && Boolean(getBarcodeDetector());

  return (
    <section className={styles.card}>
      {/* Header */}
      <div className={styles.cardHeader}>
        <div className={styles.headerLeft}>
          <div className={styles.iconBox}>
            <ScanLine size={20} />
          </div>
          <div className={styles.headerText}>
            <h2 className={styles.title}>Door Check-in</h2>
            <p className={styles.subtitle}>
              Fast check-in scanner for front-of-house staff. Scan passes using
              a camera or enter QR codes manually.
            </p>
          </div>
        </div>
        <div className={styles.statusBadge}>
          <span className={styles.pulseDot} />
          Scanner Active
        </div>
      </div>

      {/* Mode Selector */}
      <div className={styles.modeSelector}>
        <button
          type="button"
          className={`${styles.tabButton} ${
            mode === "manual" ? styles.tabButtonActive : ""
          }`}
          onClick={() => setMode("manual")}
        >
          <Keyboard size={15} />
          <span>Manual Code Entry</span>
        </button>
        <button
          type="button"
          className={`${styles.tabButton} ${
            mode === "camera" ? styles.tabButtonActive : ""
          }`}
          onClick={() => setMode("camera")}
        >
          <Camera size={15} />
          <span>Camera QR Scanner</span>
        </button>
      </div>

      {/* Camera QR Scanner Viewport */}
      {mode === "camera" && (
        <div className={styles.cameraSection}>
          <div className={styles.cameraControls}>
            <Select
              value={selectedCameraId}
              onValueChange={(val) => {
                setSelectedCameraId(val);
                if (isCameraActive) {
                  stopCamera();
                }
              }}
              disabled={disabled || cameras.length === 0}
            >
              <SelectTrigger className={styles.cameraSelectTrigger}>
                <SelectValue
                  placeholder={
                    cameras.length > 0 ? "Select Camera" : "No camera found"
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {cameras.length > 0 ? (
                  cameras.map((cam, idx) => (
                    <SelectItem
                      key={cam.deviceId || idx}
                      value={cam.deviceId || String(idx)}
                    >
                      {cam.label || `Camera ${idx + 1}`}
                    </SelectItem>
                  ))
                ) : (
                  <SelectItem value="none" disabled>
                    No camera available
                  </SelectItem>
                )}
              </SelectContent>
            </Select>

            <button
              type="button"
              className={`${styles.cameraToggleBtn} ${
                isCameraActive ? styles.cameraActiveBtn : ""
              }`}
              onClick={isCameraActive ? stopCamera : startCamera}
              disabled={disabled}
            >
              {isCameraActive ? (
                <>
                  <CameraOff size={16} />
                  <span>Pause Camera</span>
                </>
              ) : (
                <>
                  <Camera size={16} />
                  <span>Start Camera</span>
                </>
              )}
            </button>
          </div>

          <div className={styles.viewfinderContainer}>
            <video
              ref={videoRef}
              className={styles.videoElement}
              autoPlay
              playsInline
              muted
            />
            {isCameraActive ? (
              <div className={styles.viewfinderOverlay}>
                <div className={styles.targetBox} />
              </div>
            ) : (
              <div className={styles.cameraStandby}>
                <Camera size={32} />
                <span className={styles.cameraStandbyText}>
                  {cameraError || "Camera is in standby. Click Start Camera to begin scanning."}
                </span>
              </div>
            )}
          </div>

          {!hasBarcodeDetector && (
            <p className={styles.detectorNote}>
              Native QR barcode detection is not supported in this browser. Use Chrome, Edge, or Android Chrome for live camera QR decoding.
            </p>
          )}
        </div>
      )}

      {/* Manual Code Entry Form (Always accessible) */}
      <form className={styles.form} onSubmit={handleSubmitManual}>
        <div className={styles.inputWrapper}>
          <QrCode size={18} className={styles.inputIcon} />
          <input
            className={styles.input}
            placeholder="Scan pass or paste ticket QR code..."
            autoComplete="off"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            disabled={disabled || isSubmitting}
            autoFocus
          />
          {code && (
            <button
              type="button"
              className={styles.clearInputBtn}
              onClick={() => setCode("")}
              aria-label="Clear code"
            >
              <X size={16} />
            </button>
          )}
        </div>
        <button
          type="submit"
          className={styles.scanBtn}
          disabled={disabled || isSubmitting || !code.trim()}
        >
          <CheckCircle2 size={17} />
          <span>{isSubmitting ? "Checking..." : "Check In"}</span>
        </button>
      </form>

      {/* Scan Result Feedback Card */}
      {lastResult && (
        <ScanResultCard
          eventId={eventId}
          result={lastResult}
          onUndo={handleUndo}
          isUndoing={isUndoing}
        />
      )}

      {/* Compact Recent Session Scans List */}
      {recentScans.length > 0 && (
        <div className={styles.recentSection}>
          <div className={styles.recentHeader}>
            <div className={styles.recentTitleGroup}>
              <Clock size={14} />
              <span>Recent Session Scans</span>
            </div>
            <span className={styles.recentCountBadge}>
              {recentScans.length} scans
            </span>
          </div>

          <div className={styles.recentList}>
            {recentScans.map((scanItem) => (
              <div key={scanItem.id} className={styles.recentItem}>
                <div className={styles.recentItemLeft}>
                  <span
                    className={
                      scanItem.status === "success"
                        ? styles.statusDotSuccess
                        : styles.statusDotError
                    }
                  />
                  <div className={styles.recentItemText}>
                    <span className={styles.recentItemCode}>
                      {scanItem.code}
                    </span>
                    <span className={styles.recentItemSub}>
                      {scanItem.status === "success"
                        ? `${scanItem.attendeeName ? `${scanItem.attendeeName} · ` : ""}${scanItem.ticketTier || "Pass"}`
                        : scanItem.message}
                    </span>
                  </div>
                </div>

                <div className={styles.recentItemRight}>
                  <span className={styles.recentTime}>
                    {scanItem.timestamp}
                  </span>
                  {scanItem.status === "success" && scanItem.ticketId && (
                    scanItem.undone ? (
                      <span className={styles.undonePill}>Undone</span>
                    ) : (
                      <button
                        type="button"
                        className={styles.miniUndoBtn}
                        onClick={() => handleUndo(scanItem.ticketId!)}
                        disabled={isUndoing}
                        title="1-Click Undo"
                      >
                        <RotateCcw
                          size={11}
                          className={isUndoing ? styles.spinning : ""}
                        />
                        <span>Undo</span>
                      </button>
                    )
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Informational Footer */}
      <div className={styles.infoBar}>
        <Info size={14} className={styles.infoIcon} />
        <span>
          Only paid, approved, and active passes for this event will be accepted
          for admission.
        </span>
      </div>
    </section>
  );
}
