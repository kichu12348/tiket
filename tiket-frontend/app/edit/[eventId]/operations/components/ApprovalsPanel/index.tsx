"use client";

import { useState, useEffect, useMemo } from "react";
import type {
  OperationsAttendee,
  AttendeeFormResponseItem,
} from "@/types/operations";
import { fetchOperationsAttendees, decideApproval } from "@/api/operations";
import { getAttendeeFormResponses } from "@/api/attendees";
import { getErrorMessage } from "@/lib/errors";
import { toast } from "sonner";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
import {
  Clock,
  Check,
  X,
  FileText,
  Search,
  CheckCircle2,
  AlertCircle,
  Loader2,
} from "lucide-react";
import {
  getInitials,
  formatDateTime,
  getAttendeeTierName,
} from "./functions/formatters";
import styles from "./ApprovalsPanel.module.css";

export interface ApprovalsPanelProps {
  eventId: string;
  refreshKey: number;
  onDecisionComplete?: () => void;
}

export default function ApprovalsPanel({
  eventId,
  refreshKey,
  onDecisionComplete,
}: ApprovalsPanelProps) {
  const [attendees, setAttendees] = useState<OperationsAttendee[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState<string>("");

  // Sheet drawer state
  const [sheetOpen, setSheetOpen] = useState<boolean>(false);
  const [selectedAttendee, setSelectedAttendee] =
    useState<OperationsAttendee | null>(null);
  const [formResponses, setFormResponses] = useState<
    AttendeeFormResponseItem[]
  >([]);
  const [loadingResponses, setLoadingResponses] = useState<boolean>(false);

  // In-flight decision tracking by order id
  const [processingOrderId, setProcessingOrderId] = useState<string | null>(
    null,
  );

  useEffect(() => {
    let isMounted = true;
    if (!eventId) return;

    fetchOperationsAttendees(eventId, {
      status: "pending_approval",
      limit: 100,
    })
      .then((data) => {
        if (isMounted) {
          setAttendees(data.attendees || []);
          setError(null);
        }
      })
      .catch((err) => {
        if (isMounted) {
          setError(getErrorMessage(err) || "Failed to load pending registrations.");
        }
      })
      .finally(() => {
        if (isMounted) {
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [eventId, refreshKey]);

  const handleDecision = async (
    attendee: OperationsAttendee,
    decision: "approve" | "reject",
  ) => {
    const orderId = attendee.order?.id;
    if (!orderId) {
      toast.error("Order ID not found for this registration.");
      return;
    }

    setProcessingOrderId(orderId);
    try {
      const response = await decideApproval(eventId, orderId, decision);
      toast.success(
        response.message ||
          (decision === "approve"
            ? "Registration approved successfully."
            : "Registration rejected and refunded."),
      );

      // Optimistic list update
      setAttendees((prev) => prev.filter((a) => a.order?.id !== orderId));

      if (selectedAttendee?.order?.id === orderId) {
        setSheetOpen(false);
        setSelectedAttendee(null);
      }

      onDecisionComplete?.();
    } catch (err) {
      toast.error(
        getErrorMessage(err) || `Failed to ${decision} registration.`,
      );
    } finally {
      setProcessingOrderId(null);
    }
  };

  const handleOpenSheet = async (attendee: OperationsAttendee) => {
    setSelectedAttendee(attendee);
    setSheetOpen(true);

    if (attendee.formResponses && attendee.formResponses.length > 0) {
      setFormResponses(attendee.formResponses);
      return;
    }

    setLoadingResponses(true);
    try {
      const result = await getAttendeeFormResponses(eventId, attendee.id);
      const mappedResponses: AttendeeFormResponseItem[] = (
        result.responses || []
      ).map((item) => ({
        fieldId: item.fieldId || "",
        label: item.label,
        fieldType: item.fieldType || "text",
        value: item.value,
      }));
      setFormResponses(mappedResponses);
    } catch {
      setFormResponses([]);
    } finally {
      setLoadingResponses(false);
    }
  };

  const filteredAttendees = useMemo(() => {
    if (!search.trim()) return attendees;
    const query = search.toLowerCase().trim();
    return attendees.filter((a) => {
      const name = a.user?.name?.toLowerCase() || "";
      const email = a.user?.email?.toLowerCase() || "";
      const orderId = a.order?.id?.toLowerCase() || "";
      const qrCode = a.qrCode?.toLowerCase() || "";
      return (
        name.includes(query) ||
        email.includes(query) ||
        orderId.includes(query) ||
        qrCode.includes(query)
      );
    });
  }, [attendees, search]);

  return (
    <>
      <Card className={styles.card}>
        <CardHeader className={styles.cardHeader}>
          <div className={styles.headerTitleRow}>
            <div className={styles.headerLeft}>
              <div className={styles.iconBox}>
                <Clock size={18} />
              </div>
              <div>
                <CardTitle className={styles.cardTitle}>
                  Pending Approvals
                </CardTitle>
                <CardDescription className={styles.cardDescription}>
                  Registrations that require host confirmation before tickets
                  are activated. Rejecting automatically initiates a full
                  refund.
                </CardDescription>
              </div>
            </div>

            <Badge variant="outline" className={styles.countBadge}>
              <Clock size={13} />
              <span>{attendees.length} Pending</span>
            </Badge>
          </div>

          {attendees.length > 0 && (
            <div className={styles.tableControls}>
              <div className={styles.searchBox}>
                <Search size={15} className={styles.searchIcon} />
                <Input
                  type="text"
                  placeholder="Filter by guest name, email, or order ID…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className={styles.searchInput}
                />
              </div>
            </div>
          )}
        </CardHeader>

        <CardContent className={styles.cardContent}>
          {error && (
            <div className="flex items-center gap-2 rounded-lg bg-destructive/15 p-3 text-sm text-destructive">
              <AlertCircle size={16} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {loading && attendees.length === 0 ? (
            <div className="flex flex-col gap-3 py-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center justify-between py-2">
                  <div className="flex items-center gap-3">
                    <Skeleton className="h-9 w-9 rounded-full" />
                    <div className="flex flex-col gap-1.5">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-3 w-48" />
                    </div>
                  </div>
                  <Skeleton className="h-8 w-24" />
                </div>
              ))}
            </div>
          ) : filteredAttendees.length === 0 ? (
            <div className={styles.emptyState}>
              <CheckCircle2 size={36} className={styles.emptyIcon} />
              <h3 className={styles.emptyTitle}>All Caught Up</h3>
              <p className={styles.emptySubtitle}>
                {search.trim()
                  ? "No pending registrations match your filter criteria."
                  : "There are no guest registrations awaiting host approval at this time."}
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Attendee</TableHead>
                  <TableHead>Ticket Tier</TableHead>
                  <TableHead>Order Info</TableHead>
                  <TableHead>Form Questions</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAttendees.map((attendee) => {
                  const orderId = attendee.order?.id;
                  const isProcessing =
                    Boolean(orderId) && processingOrderId === orderId;
                  const tierName = getAttendeeTierName(attendee);

                  return (
                    <TableRow key={attendee.id}>
                      <TableCell>
                        <div className={styles.attendeeCell}>
                          <div className={styles.avatar}>
                            {getInitials(attendee.user?.name)}
                          </div>
                          <div className={styles.attendeeMeta}>
                            <span className={styles.attendeeName}>
                              {attendee.user?.name || "Anonymous Guest"}
                            </span>
                            <span className={styles.attendeeEmail}>
                              {attendee.user?.email || "No email"}
                            </span>
                          </div>
                        </div>
                      </TableCell>

                      <TableCell>
                        <Badge variant="outline" className={styles.tierBadge}>
                          {tierName}
                        </Badge>
                      </TableCell>

                      <TableCell>
                        <div className="flex flex-col gap-0.5">
                          <span className={styles.monoCode}>
                            {orderId ? orderId.slice(0, 12) : "—"}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {formatDateTime(
                              attendee.order?.createdAt || attendee.createdAt,
                            )}
                          </span>
                        </div>
                      </TableCell>

                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleOpenSheet(attendee)}
                          className={styles.answersBtn}
                        >
                          <FileText size={14} />
                          <span>View Answers</span>
                        </Button>
                      </TableCell>

                      <TableCell className="text-right">
                        <div className={styles.actionCell}>
                          <Button
                            variant="destructive"
                            size="sm"
                            className={styles.rejectBtn}
                            disabled={isProcessing}
                            onClick={() => handleDecision(attendee, "reject")}
                          >
                            {isProcessing ? (
                              <Loader2 size={13} className="animate-spin" />
                            ) : (
                              <X size={13} />
                            )}
                            <span>Reject</span>
                          </Button>

                          <Button
                            size="sm"
                            className={styles.approveBtn}
                            disabled={isProcessing}
                            onClick={() => handleDecision(attendee, "approve")}
                          >
                            {isProcessing ? (
                              <Loader2 size={13} className="animate-spin" />
                            ) : (
                              <Check size={13} />
                            )}
                            <span>Approve</span>
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Sheet Drawer for Viewing Custom Registration Answers */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent side="right" className={styles.sheetContent}>
          <SheetHeader className={styles.sheetHeader}>
            <SheetTitle className={styles.sheetTitle}>
              Registration Details
            </SheetTitle>
            <SheetDescription className={styles.sheetSubtitle}>
              Review guest information and custom questions before making an
              admission decision.
            </SheetDescription>
          </SheetHeader>

          {selectedAttendee && (
            <div className={styles.sheetBody}>
              <div className={styles.attendeeSummary}>
                <div className={styles.attendeeHeader}>
                  <div className={styles.sheetAvatar}>
                    {getInitials(selectedAttendee.user?.name)}
                  </div>
                  <div>
                    <div className={styles.userName}>
                      {selectedAttendee.user?.name || "Anonymous Guest"}
                    </div>
                    <div className={styles.userEmail}>
                      {selectedAttendee.user?.email || "No email"}
                    </div>
                  </div>
                </div>

                <div className={styles.detailGrid}>
                  <div className={styles.detailItem}>
                    <span className={styles.detailLabel}>Ticket Tier</span>
                    <span className={styles.detailValue}>
                      {getAttendeeTierName(selectedAttendee)}
                    </span>
                  </div>
                  <div className={styles.detailItem}>
                    <span className={styles.detailLabel}>Order ID</span>
                    <span className={styles.detailValueMono}>
                      {selectedAttendee.order?.id?.slice(0, 12) || "—"}
                    </span>
                  </div>
                  <div className={styles.detailItem}>
                    <span className={styles.detailLabel}>
                      Registration Date
                    </span>
                    <span className={styles.detailValue}>
                      {formatDateTime(
                        selectedAttendee.order?.createdAt ||
                          selectedAttendee.createdAt,
                      )}
                    </span>
                  </div>
                  <div className={styles.detailItem}>
                    <span className={styles.detailLabel}>Total Paid</span>
                    <span className={styles.detailValue}>
                      {selectedAttendee.order?.totalAmount
                        ? `₹${selectedAttendee.order.totalAmount}`
                        : "Free"}
                    </span>
                  </div>
                </div>
              </div>

              <div className={styles.formSection}>
                <h4 className={styles.sectionHeading}>
                  Custom Registration Responses
                </h4>

                {loadingResponses ? (
                  <div className="flex flex-col gap-2 py-2">
                    <Skeleton className="h-14 w-full rounded-md" />
                    <Skeleton className="h-14 w-full rounded-md" />
                  </div>
                ) : formResponses.length === 0 ? (
                  <div className={styles.emptyFormResponses}>
                    No custom registration questions were answered for this
                    order.
                  </div>
                ) : (
                  <div className={styles.formList}>
                    {formResponses.map((item, idx) => (
                      <div
                        key={item.fieldId || idx}
                        className={styles.formFieldItem}
                      >
                        <div className={styles.fieldLabel}>{item.label}</div>
                        <div className={styles.fieldValue}>
                          {item.value || "—"}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {selectedAttendee && (
            <SheetFooter className={styles.sheetFooter}>
              <Button
                variant="destructive"
                className={styles.sheetRejectBtn}
                disabled={
                  processingOrderId === selectedAttendee.order?.id ||
                  !selectedAttendee.order?.id
                }
                onClick={() => handleDecision(selectedAttendee, "reject")}
              >
                {processingOrderId === selectedAttendee.order?.id ? (
                  <Loader2 size={15} className="animate-spin" />
                ) : (
                  <X size={15} />
                )}
                <span>Reject & Refund</span>
              </Button>

              <Button
                className={styles.sheetApproveBtn}
                disabled={
                  processingOrderId === selectedAttendee.order?.id ||
                  !selectedAttendee.order?.id
                }
                onClick={() => handleDecision(selectedAttendee, "approve")}
              >
                {processingOrderId === selectedAttendee.order?.id ? (
                  <Loader2 size={15} className="animate-spin" />
                ) : (
                  <Check size={15} />
                )}
                <span>Approve Admission</span>
              </Button>
            </SheetFooter>
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}
