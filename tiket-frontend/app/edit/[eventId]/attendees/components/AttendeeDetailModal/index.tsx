import { useState, useEffect } from "react";
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
} from "lucide-react";
import Modal from "@/components/Modal";
import { AttendeeDetailResponse, FormResponseItem } from "@/types/attendee";
import { getAttendeeFormResponses } from "@/api/attendees";
import { toast } from "sonner";
import styles from "./AttendeeDetailModal.module.css";

interface AttendeeDetailModalProps {
  eventId: string;
  detail: AttendeeDetailResponse | null;
  isLoading: boolean;
  onClose: () => void;
  onToggleCheckIn: (ticketId: string) => void;
  onCancelTicket: (ticketId: string) => void;
}

export default function AttendeeDetailModal({
  eventId,
  detail,
  isLoading,
  onClose,
  onToggleCheckIn,
  onCancelTicket,
}: AttendeeDetailModalProps) {
  const isOpen = !!detail || isLoading;

  const [isResponsesExpanded, setIsResponsesExpanded] = useState(false);
  const [formResponses, setFormResponses] = useState<FormResponseItem[] | null>(null);
  const [isLoadingResponses, setIsLoadingResponses] = useState(false);

  // Reset lazy state when detail ticket changes
  useEffect(() => {
    setIsResponsesExpanded(false);
    setFormResponses(null);
    setIsLoadingResponses(false);
  }, [detail?.attendee.id]);

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
      } catch (err: any) {
        toast.error("Failed to load registration answers.");
      } finally {
        setIsLoadingResponses(false);
      }
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
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
              <div className={`${styles.skeleton} ${styles.skeletonMetaItem}`} />
              <div className={`${styles.skeleton} ${styles.skeletonMetaItem}`} />
              <div className={`${styles.skeleton} ${styles.skeletonMetaItem}`} />
              <div className={`${styles.skeleton} ${styles.skeletonMetaItem}`} />
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
                      <div className={`${styles.skeleton} ${styles.skeletonAnswerBox}`} />
                      <div className={`${styles.skeleton} ${styles.skeletonAnswerBox}`} />
                    </div>
                  ) : formResponses && formResponses.length > 0 ? (
                    <div className={styles.formResponseList}>
                      {formResponses.map((resp, idx) => (
                        <div key={idx} className={styles.responseItem}>
                          <span className={styles.responseLabel}>{resp.label}</span>
                          <span className={styles.responseValue}>
                            {resp.value || "(No answer provided)"}
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
                  <h4>Check-In Log</h4>
                </div>
                <div className={styles.checkInList}>
                  {detail.checkIns.map((ci) => (
                    <div key={ci.id} className={styles.checkInItem}>
                      <span>
                        {new Date(ci.checkedInAt).toLocaleString(undefined, {
                          dateStyle: "medium",
                          timeStyle: "short",
                        })}
                      </span>
                      {ci.loggedBy && <span>by {ci.loggedBy.name}</span>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Footer Action Row */}
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
              </div>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
