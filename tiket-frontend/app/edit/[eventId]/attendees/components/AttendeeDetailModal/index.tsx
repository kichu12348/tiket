import { useFileDownload } from "@/hooks/useFileDownload";
import { useState } from "react";
import Link from "next/link";
import {
  Mail,
  Ticket,
  Calendar,
  CheckCircle2,
  XCircle,
  ExternalLink,
  ClipboardList,
  Clock,
  ChevronDown,
  ChevronUp,
  Check,
  X,
  Download,
  Ban,
} from "lucide-react";
import Modal from "@/components/Modal";
import type {
  AttendeeDetailResponse,
  FormResponseItem,
} from "@/types/attendee";
import { getAttendeeFormResponses } from "@/api/attendees";
import { createBlacklistEntry } from "@/api/commerce";
import { getErrorMessage } from "@/lib/errors";
import { toast } from "sonner";
import styles from "./AttendeeDetailModal.module.css";

interface AttendeeDetailModalProps {
  eventId: string;
  detail: AttendeeDetailResponse | null;
  isLoading: boolean;
  onClose: () => void;
  onToggleCheckIn: (ticketId: string) => void;
  onCancelTicket: (ticketId: string) => void;
  onDecide?: (orderId: string, decision: "approve" | "decline") => void;
}

export default function AttendeeDetailModal({
  eventId,
  detail,
  isLoading,
  onClose,
  onToggleCheckIn,
  onCancelTicket,
  onDecide,
}: AttendeeDetailModalProps) {
  const isOpen = !!detail || isLoading;

  const [isResponsesExpanded, setIsResponsesExpanded] = useState(false);
  const downloadFile = useFileDownload();
  const [formResponses, setFormResponses] = useState<FormResponseItem[] | null>(
    null,
  );
  const [isLoadingResponses, setIsLoadingResponses] = useState(false);
  const [showBlockConfirm, setShowBlockConfirm] = useState(false);
  const [blockScope, setBlockScope] = useState<"event" | "organization">(
    "event",
  );
  const [cancelExisting, setCancelExisting] = useState(true);
  const [blockReason, setBlockReason] = useState("");
  const [isBlocking, setIsBlocking] = useState(false);

  const handleBlockAttendee = async () => {
    if (!detail) return;
    try {
      setIsBlocking(true);
      await createBlacklistEntry(eventId, {
        targetUserId: detail.attendee.user.id,
        scope: blockScope,
        reason: blockReason.trim() || undefined,
        cancelExistingTickets: cancelExisting,
      });
      toast.success("Attendee blocked successfully.");
      if (cancelExisting) {
        onCancelTicket(detail.attendee.id);
      }
      setShowBlockConfirm(false);
      onClose();
    } catch (err: unknown) {
      toast.error(getErrorMessage(err) || "Failed to block attendee.");
    } finally {
      setIsBlocking(false);
    }
  };

  const handleToggleFormResponses = async () => {
    if (!detail) return;
    const nextState = !isResponsesExpanded;
    setIsResponsesExpanded(nextState);

    // Lazy load if expanding for the first time
    if (nextState && formResponses === null) {
      try {
        setIsLoadingResponses(true);
        const res = await getAttendeeFormResponses(eventId, detail.attendee.id);
        setFormResponses(res.responses);
      } catch {
        toast.error("Failed to load registration answers.");
      } finally {
        setIsLoadingResponses(false);
      }
    }
  };

  const handleModalClose = () => {
    setShowBlockConfirm(false);
    setBlockReason("");
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleModalClose}
      title="Attendee Details"
      width={465}
      className={styles.modalContent}
      headerClassName={styles.modalHeaderStyle}
    >
      <div className={styles.modalScrollWrapper}>
        {isLoading || !detail ? (
          <div className={styles.skeletonBody}>
            {/* Profile Skeleton */}
            <div className={styles.skeletonProfileCard}>
              <div className={`${styles.skeleton} ${styles.skeletonAvatar}`} />
              <div className={styles.skeletonProfileInfo}>
                <div className={`${styles.skeleton} ${styles.skeletonName}`} />
                <div className={`${styles.skeleton} ${styles.skeletonEmail}`} />
              </div>
            </div>

            {/* Grid Metadata Skeleton */}
            <div className={styles.skeletonMetaGrid}>
              <div
                className={`${styles.skeleton} ${styles.skeletonMetaItem}`}
              />
              <div
                className={`${styles.skeleton} ${styles.skeletonMetaItem}`}
              />
              <div
                className={`${styles.skeleton} ${styles.skeletonMetaItem}`}
              />
              <div
                className={`${styles.skeleton} ${styles.skeletonMetaItem}`}
              />
            </div>
          </div>
        ) : (
          <div className={styles.body}>
            {/* Profile Summary Header */}
            <div className={styles.profileCard}>
              <div className={styles.avatar}>
                {detail.attendee.user.name.charAt(0).toUpperCase()}
              </div>
              <div className={styles.profileInfo}>
                <h3 className={styles.attendeeName}>
                  {detail.attendee.user.name}
                </h3>
                <span className={styles.attendeeEmail}>
                  <Mail size={13} />
                  {detail.attendee.user.email}
                </span>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                <span
                  className={styles.statusBadge}
                  data-status={detail.attendee.status}
                >
                  {detail.attendee.status === "used" ? (
                    <>
                      <CheckCircle2 size={12} /> Checked In
                    </>
                  ) : (
                    detail.attendee.status.toUpperCase()
                  )}
                </span>
                {detail.checkIns && detail.checkIns.length > 0 && (
                  <span className={styles.scanCountBadge}>
                    {detail.checkIns.length} scan
                    {detail.checkIns.length > 1 ? "s" : ""}
                  </span>
                )}
              </div>
            </div>

            {/* Ticket Metadata Grid */}
            <div className={styles.metaGrid}>
              <div className={styles.metaItem}>
                <span className={styles.metaLabel}>Ticket Type</span>
                <span className={styles.metaValue}>
                  <Ticket size={13} /> {detail.attendee.ticketType.name}
                </span>
              </div>

              <div className={styles.metaItem}>
                <span className={styles.metaLabel}>Price Paid</span>
                <span className={styles.metaValuePrice}>
                  ₹{detail.attendee.ticketType.price}
                </span>
              </div>

              <div className={styles.metaItem}>
                <span className={styles.metaLabel}>Payment Status</span>
                <span className={styles.metaValue}>
                  {detail.attendee.order.paymentStatus.toUpperCase()}
                </span>
              </div>

              <div className={styles.metaItem}>
                <span className={styles.metaLabel}>Registered Date</span>
                <span className={styles.metaValue}>
                  <Calendar size={13} />
                  {new Date(detail.attendee.createdAt).toLocaleDateString(
                    undefined,
                    {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    },
                  )}
                </span>
              </div>
            </div>

            {/* Lazy-Loaded Registration Form Answers Accordion */}
            <div className={styles.section}>
              <button
                type="button"
                onClick={handleToggleFormResponses}
                className={styles.accordionHeaderBtn}
              >
                <div className={styles.accordionTitle}>
                  <ClipboardList size={15} />
                  <span>Registration Form Answers</span>
                </div>
                {isResponsesExpanded ? (
                  <ChevronUp size={16} />
                ) : (
                  <ChevronDown size={16} />
                )}
              </button>

              {isResponsesExpanded && (
                <div className={styles.accordionContent}>
                  {isLoadingResponses ? (
                    <div className={styles.inlineSkeletonList}>
                      <div
                        className={`${styles.skeleton} ${styles.skeletonAnswerBox}`}
                      />
                      <div
                        className={`${styles.skeleton} ${styles.skeletonAnswerBox}`}
                      />
                    </div>
                  ) : formResponses && formResponses.length > 0 ? (
                    <div className={styles.formResponseList}>
                      {formResponses.map((resp, idx) => (
                        <div key={idx} className={styles.responseItem}>
                          <span className={styles.responseLabel}>
                            {resp.label}
                          </span>
                          <span className={styles.responseValue}>
                            {resp.value.startsWith("file:") ? (
                              <button
                                type="button"
                                onClick={() => downloadFile(resp.value)}
                                className="inline-flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300 underline font-medium cursor-pointer"
                              >
                                <Download size={13} />
                                <span>Download file</span>
                              </button>
                            ) : (
                              resp.value || "(No answer provided)"
                            )}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <span className={styles.noAnswersText}>
                      No custom form responses for this ticket.
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Check-In History */}
            {detail.checkIns && detail.checkIns.length > 0 && (
              <div className={styles.section}>
                <div className={styles.sectionHeader}>
                  <Clock size={15} />
                  <h4>Check-In Log ({detail.checkIns.length})</h4>
                </div>
                <div className={styles.checkInList}>
                  {detail.checkIns.map((ci, idx) => (
                    <div key={ci.id} className={styles.checkInItem}>
                      <div className="flex items-center gap-2">
                        <span className={styles.checkInIndex}>
                          #{detail.checkIns.length - idx}
                        </span>
                        <span>
                          {new Date(ci.checkedInAt).toLocaleString(undefined, {
                            dateStyle: "medium",
                            timeStyle: "short",
                          })}
                        </span>
                      </div>
                      {ci.loggedBy && <span>by {ci.loggedBy.name}</span>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {showBlockConfirm ? (
              <div className={styles.blockCard}>
                <div className={styles.blockTitle}>
                  <Ban size={16} />
                  <span>Block Attendee</span>
                </div>
                <p className={styles.blockDesc}>
                  Restricts <strong>{detail.attendee.user.name}</strong> (
                  {detail.attendee.user.email}) from purchasing tickets or
                  receiving transfers for this organizer.
                </p>
                <div className={styles.blockField}>
                  <label className={styles.blockLabel}>Block Scope</label>
                  <select
                    className={styles.blockInput}
                    value={blockScope}
                    onChange={(e) =>
                      setBlockScope(e.target.value as "event" | "organization")
                    }
                  >
                    <option value="event">This Event Only</option>
                    <option value="organization">
                      All Events (Organization-wide)
                    </option>
                  </select>
                </div>
                <div className={styles.blockField}>
                  <label className={styles.blockLabel}>Reason (Optional)</label>
                  <input
                    type="text"
                    className={styles.blockInput}
                    value={blockReason}
                    onChange={(e) => setBlockReason(e.target.value)}
                    placeholder="e.g. Chargeback risk, violation"
                  />
                </div>
                <label className={styles.blockCheckboxLabel}>
                  <input
                    type="checkbox"
                    checked={cancelExisting}
                    onChange={(e) => setCancelExisting(e.target.checked)}
                  />
                  <span>Cancel existing active & pending tickets</span>
                </label>
                <div className={styles.blockActions}>
                  <button
                    type="button"
                    onClick={() => setShowBlockConfirm(false)}
                    disabled={isBlocking}
                    className={styles.btnSecondary}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleBlockAttendee}
                    disabled={isBlocking}
                    className={styles.btnDanger}
                  >
                    <Ban size={14} />
                    <span>{isBlocking ? "Blocking..." : "Confirm Block"}</span>
                  </button>
                </div>
              </div>
            ) : (
              /* Footer Action Row */
              <div className={styles.footerActions}>
                <Link
                  href={`/passes/${detail.attendee.id}`}
                  target="_blank"
                  className={styles.passLinkBtn}
                >
                  <ExternalLink size={14} />
                  <span>Public Pass</span>
                </Link>

                <div className={styles.rightActionBtns}>
                  <button
                    type="button"
                    onClick={() => setShowBlockConfirm(true)}
                    className={styles.btnDanger}
                    title="Block User"
                  >
                    <Ban size={14} />
                    <span>Block User</span>
                  </button>

                  {detail.attendee.status === "pending_approval" && onDecide ? (
                    <>
                      <button
                        type="button"
                        onClick={() =>
                          onDecide(detail.attendee.order.id, "decline")
                        }
                        className={styles.btnDanger}
                      >
                        <X size={14} />
                        <span>Decline</span>
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          onDecide(detail.attendee.order.id, "approve")
                        }
                        className={styles.btnPrimary}
                      >
                        <Check size={14} />
                        <span>Approve</span>
                      </button>
                    </>
                  ) : (
                    <>
                      {detail.attendee.status !== "cancelled" &&
                        detail.attendee.status !== "refunded" && (
                          <button
                            onClick={() => onCancelTicket(detail.attendee.id)}
                            className={styles.btnDanger}
                          >
                            <XCircle size={14} />
                            <span>Cancel Ticket</span>
                          </button>
                        )}

                      <button
                        onClick={() => onToggleCheckIn(detail.attendee.id)}
                        disabled={
                          detail.attendee.status === "cancelled" ||
                          detail.attendee.status === "refunded"
                        }
                        className={
                          detail.attendee.status === "used"
                            ? styles.btnSecondary
                            : styles.btnPrimary
                        }
                      >
                        <CheckCircle2 size={14} />
                        <span>
                          {detail.attendee.status === "used"
                            ? "Undo Check-In"
                            : "Check In"}
                        </span>
                      </button>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
}
