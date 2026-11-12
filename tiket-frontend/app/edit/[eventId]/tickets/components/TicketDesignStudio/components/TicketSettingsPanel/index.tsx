"use client";

import React, { useState } from "react";
import {
  Globe,
  CalendarIcon,
  Clock,
  Copy,
  Check,
  Palette,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover";
import Switch from "@/components/Switch";
import Dropdown from "@/components/Dropdown";
import ConditionBuilder from "@/components/ConditionBuilder";
import RichTextEditor from "@/components/DescriptionModal/RichTextEditor";
import { format } from "date-fns";
import { toast } from "sonner";
import type { FormField, VisibilityConditionsConfig } from "@/types/form";
import styles from "./TicketSettingsPanel.module.css";
import { cn } from "@/lib/utils";

const TIME_OPTIONS = Array.from({ length: 48 }).map((_, i) => {
  const hours = Math.floor(i / 2);
  const minutes = i % 2 === 0 ? "00" : "30";
  const label = `${hours.toString().padStart(2, "0")}:${minutes}`;
  return { label, value: label, LeftComponent: <Clock size={14} /> };
});

const updateTime = (
  dateStr: string,
  timeValue: string,
  setDate: (d: string) => void,
) => {
  if (!dateStr) return;
  const [hours, minutes] = timeValue.split(":").map(Number);
  const newDate = new Date(dateStr);
  newDate.setHours(hours, minutes, 0, 0);
  setDate(newDate.toISOString());
};

const updateDate = (
  dateStr: string,
  newDate: Date | undefined,
  setDate: (d: string) => void,
) => {
  if (!newDate) return;
  const currentDate = dateStr ? new Date(dateStr) : new Date();
  currentDate.setFullYear(
    newDate.getFullYear(),
    newDate.getMonth(),
    newDate.getDate(),
  );
  setDate(currentDate.toISOString());
};

interface TicketSettingsPanelProps {
  name: string;
  setName: (v: string) => void;
  description: string;
  setDescription: (v: string) => void;
  isPaid: boolean;
  setIsPaid: (v: boolean) => void;
  price: string;
  setPrice: (v: string) => void;
  collectGst: boolean;
  setCollectGst: (v: boolean) => void;
  passFeeToCustomer: boolean;
  setPassFeeToCustomer: (v: boolean) => void;
  hasLimitCapacity: boolean;
  setHasLimitCapacity: (v: boolean) => void;
  quantityLimit: string;
  setQuantityLimit: (v: string) => void;
  hasMaxPerUser: boolean;
  setHasMaxPerUser: (v: boolean) => void;
  maxPerUser: string;
  setMaxPerUser: (v: string) => void;
  isFixedDefault: boolean;
  setIsFixedDefault: (v: boolean) => void;
  enableWaitlist: boolean;
  setEnableWaitlist: (v: boolean) => void;
  multiDayCheckIn: boolean;
  setMultiDayCheckIn: (v: boolean) => void;
  isClosed: boolean;
  setIsClosed: (v: boolean) => void;
  isHidden: boolean;
  setIsHidden: (v: boolean) => void;
  saleStart: string;
  setSaleStart: (v: string) => void;
  saleEnd: string;
  setSaleEnd: (v: string) => void;
  isRefundable: boolean;
  setIsRefundable: (v: boolean) => void;
  isTransferable: boolean;
  setIsTransferable: (v: boolean) => void;
  maxTransfers: string;
  setMaxTransfers: (v: string) => void;
  category: string;
  setCategory: (v: string) => void;
  poolCapacity: string;
  setPoolCapacity: (v: string) => void;
  codePrefix: string;
  setCodePrefix: (v: string) => void;
  codeLength: number;
  setCodeLength: (v: number) => void;
  tagsInput: string;
  setTagsInput: (v: string) => void;
  conditions: VisibilityConditionsConfig;
  setConditions: (v: VisibilityConditionsConfig) => void;
  formFields: FormField[];
  feePercent: number;
  gatewayFeePercent: number;
  parsedPrice: number;
  feeRupees: number;
  formatRupees: (v: number) => string;
  totalPriceForUser: number;
  timezone: string;
  eventCapacityDisplay: string | number;
  directTicketUrl: string;
  onSwitchToDesign: () => void;
}

export default function TicketSettingsPanel({
  name,
  setName,
  description,
  setDescription,
  isPaid,
  setIsPaid,
  price,
  setPrice,
  collectGst,
  setCollectGst,
  passFeeToCustomer,
  setPassFeeToCustomer,
  hasLimitCapacity,
  setHasLimitCapacity,
  quantityLimit,
  setQuantityLimit,
  hasMaxPerUser,
  setHasMaxPerUser,
  maxPerUser,
  setMaxPerUser,
  isFixedDefault,
  setIsFixedDefault,
  enableWaitlist,
  setEnableWaitlist,
  multiDayCheckIn,
  setMultiDayCheckIn,
  isClosed,
  setIsClosed,
  isHidden,
  setIsHidden,
  saleStart,
  setSaleStart,
  saleEnd,
  setSaleEnd,
  isRefundable,
  setIsRefundable,
  isTransferable,
  setIsTransferable,
  maxTransfers,
  setMaxTransfers,
  category,
  setCategory,
  poolCapacity,
  setPoolCapacity,
  codePrefix,
  setCodePrefix,
  codeLength,
  setCodeLength,
  tagsInput,
  setTagsInput,
  conditions,
  setConditions,
  formFields,
  feePercent,
  gatewayFeePercent,
  parsedPrice,
  feeRupees,
  formatRupees,
  totalPriceForUser,
  timezone,
  eventCapacityDisplay,
  directTicketUrl,
  onSwitchToDesign,
}: TicketSettingsPanelProps) {
  const [copiedUrl, setCopiedUrl] = useState(false);

  const handleCopyUrl = async () => {
    if (!directTicketUrl) return;
    try {
      await navigator.clipboard.writeText(directTicketUrl);
      setCopiedUrl(true);
      toast.success("Single ticket direct URL copied to clipboard!");
      setTimeout(() => setCopiedUrl(false), 2000);
    } catch {
      toast.error("Failed to copy link");
    }
  };

  return (
    <div className={`${styles.settingsContainer} scrollbar`}>
      <div className={styles.settingsContent}>
        {/* Card 1: Basic Information */}
        <section className={styles.card}>
          <div className={styles.cardHeader}>
            <div className={styles.cardTitleGroup}>
              <h3 className={styles.cardTitle}>Basic Information</h3>
              <p className={styles.cardSubtitle}>
                Set the public title and details for this ticket tier.
              </p>
            </div>
          </div>

          <div className={styles.cardBody}>
            <div className={styles.formGroup}>
              <label className={styles.label}>Ticket Title</label>
              <Input
                type="text"
                placeholder="e.g. General Admission"
                className={styles.input}
                value={name}
                onChange={(e) => setName(e.target.value)}
                data-testid="ticket-name-input"
              />
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label}>Description</label>
              <div className={styles.editorContainer}>
                <RichTextEditor
                  initialValue={description}
                  onChange={setDescription}
                />
              </div>
              <input
                type="hidden"
                data-testid="ticket-description-input"
                value={description}
              />
            </div>
          </div>
        </section>

        {/* Card 2: Pricing & Platform Fees */}
        <section className={styles.card}>
          <div className={styles.cardHeader}>
            <div className={styles.cardTitleGroup}>
              <h3 className={styles.cardTitle}>Pricing & Fees</h3>
              <p className={styles.cardSubtitle}>
                Configure attendee pricing, taxes, and platform fee
                distribution.
              </p>
            </div>
          </div>

          <div className={styles.cardBody}>
            <div className={styles.switchRow}>
              <div className={styles.switchLabelBlock}>
                <span className={styles.switchTitle}>Paid Ticket</span>
                <span className={styles.switchSubtext}>
                  Charge attendees for registration
                </span>
              </div>
              <Switch
                id="ticket-is-paid-switch"
                checked={isPaid}
                onChange={(checked) => {
                  setIsPaid(checked);
                  if (!checked) setPrice("0");
                }}
              />
            </div>

            {isPaid && (
              <div className={styles.nestedSection}>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Ticket Price</label>
                  <div className={styles.priceInputWrapper}>
                    <span className={styles.currencyPrefix}>₹</span>
                    <Input
                      type="number"
                      className={cn(styles.priceInput, styles.input)}
                      placeholder="0.00"
                      value={price}
                      onChange={(e) => setPrice(e.target.value)}
                      min="0"
                      step="0.01"
                      data-testid="ticket-price-input"
                    />
                  </div>
                </div>

                <div className={styles.switchRow}>
                  <div className={styles.switchLabelBlock}>
                    <span className={styles.switchTitle}>Collect GST</span>
                    <span className={styles.switchSubtext}>
                      Apply GST calculation on checkout
                    </span>
                  </div>
                  <Switch checked={collectGst} onChange={setCollectGst} />
                </div>

                <div className={styles.switchRow}>
                  <div className={styles.switchLabelBlock}>
                    <span className={styles.switchTitle}>
                      Include Platform Fee ( ₹{formatRupees(feeRupees)} )
                    </span>
                    <span className={styles.switchSubtext}>
                      Pass platform processing fees to the attendee
                    </span>
                  </div>
                  <Switch
                    id="ticket-pass-fee-switch"
                    checked={passFeeToCustomer}
                    onChange={setPassFeeToCustomer}
                  />
                </div>

                {/* Live Fee Breakdown Preview */}
                <div
                  className={styles.feeBreakdownBox}
                  data-testid="fee-breakdown-preview"
                >
                  <div className={styles.feeBreakdownRow}>
                    <span>Platform Fee: {feePercent}%</span>
                    <span>Gateway Fee: {gatewayFeePercent}%</span>
                  </div>
                  <div className={styles.greenTotal}>
                    {passFeeToCustomer
                      ? `Total Price for User: ₹${formatRupees(totalPriceForUser)}`
                      : `Total Price for User: ₹${formatRupees(parsedPrice)} (fee deducted from earnings)`}
                  </div>
                  <div className={styles.feeBreakdownDetail}>
                    {passFeeToCustomer
                      ? `Customer pays ₹${formatRupees(parsedPrice + feeRupees)} (+${feePercent}% fee) • You receive ₹${formatRupees(parsedPrice)}`
                      : `Customer pays ₹${formatRupees(parsedPrice)} (Fee included) • You receive ₹${formatRupees(parsedPrice - feeRupees)} (${feePercent}% fee deducted)`}
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Card 3: Capacity & Limits */}
        <section className={styles.card}>
          <div className={styles.cardHeader}>
            <div className={styles.cardTitleGroup}>
              <h3 className={styles.cardTitle}>Capacity & Limits</h3>
              <p className={styles.cardSubtitle}>
                Manage ticket inventory and booking constraints. (Total Event
                Capacity: {eventCapacityDisplay})
              </p>
            </div>
          </div>

          <div className={styles.cardBody}>
            {/* Limit Capacity Switch & Input */}
            <div className={styles.formGroup}>
              <div className={styles.switchRow}>
                <div className={styles.switchLabelBlock}>
                  <span className={styles.switchTitle}>
                    Limit Capacity (Max: {eventCapacityDisplay})
                  </span>
                  <span className={styles.switchSubtext}>
                    Restrict total seats available for this tier
                  </span>
                </div>
                <Switch
                  id="ticket-limit-capacity-switch"
                  checked={hasLimitCapacity}
                  onChange={(checked) => {
                    setHasLimitCapacity(checked);
                    if (!checked) setQuantityLimit("");
                  }}
                />
              </div>
              {hasLimitCapacity && (
                <div className={styles.conditionalInputWrapper}>
                  <Input
                    type="number"
                    placeholder="Total capacity for this tier"
                    className={styles.input}
                    value={quantityLimit}
                    onChange={(e) => setQuantityLimit(e.target.value)}
                    min="1"
                    data-testid="ticket-quantity-input"
                  />
                </div>
              )}
            </div>

            <div className={styles.divider} />

            {/* Limit Per User */}
            <div className={styles.formGroup}>
              <div className={styles.switchRow}>
                <div className={styles.switchLabelBlock}>
                  <span className={styles.switchTitle}>
                    Limit Tickets Per User
                  </span>
                  <span className={styles.switchSubtext}>
                    Cap the quantity a single attendee can purchase
                  </span>
                </div>
                <Switch
                  checked={hasMaxPerUser}
                  onChange={(checked) => {
                    setHasMaxPerUser(checked);
                    if (!checked) setMaxPerUser("");
                  }}
                />
              </div>
              {hasMaxPerUser && (
                <div className={styles.conditionalInputWrapper}>
                  <Input
                    type="number"
                    placeholder="e.g. 2"
                    value={maxPerUser}
                    className={styles.input}
                    onChange={(e) => setMaxPerUser(e.target.value)}
                    min="1"
                    data-testid="ticket-max-per-user-input"
                  />
                </div>
              )}
            </div>

            <div className={styles.divider} />

            {/* Fixed As My Ticket */}
            <div className={styles.switchRow}>
              <div className={styles.switchLabelBlock}>
                <span className={styles.switchTitle}>Fixed As My Ticket</span>
                <span className={styles.switchSubtext}>
                  Pre-selects this ticket by default on the registration form
                </span>
              </div>
              <Switch checked={isFixedDefault} onChange={setIsFixedDefault} />
            </div>

            <div className={styles.divider} />

            {/* Waitlisting */}
            <div className={styles.switchRow}>
              <div className={styles.switchLabelBlock}>
                <span className={styles.switchTitle}>Waitlisting</span>
                <span className={styles.switchSubtext}>
                  Allow attendees to join a waitlist when this tier is full
                </span>
              </div>
              <Switch checked={enableWaitlist} onChange={setEnableWaitlist} />
            </div>

            <div className={styles.divider} />

            {/* Multi-Day CheckIn */}
            <div className={styles.switchRow}>
              <div className={styles.switchLabelBlock}>
                <span className={styles.switchTitle}>Multi-Day CheckIn</span>
                <span className={styles.switchSubtext}>
                  Allow attendees to check in across multiple days of the event
                </span>
              </div>
              <Switch checked={multiDayCheckIn} onChange={setMultiDayCheckIn} />
            </div>
          </div>
        </section>

        {/* Card 4: Sales Schedule & Visibility */}
        <section className={styles.card}>
          <div className={styles.cardHeader}>
            <div className={styles.cardTitleGroup}>
              <h3 className={styles.cardTitle}>Sales Schedule & Visibility</h3>
              <p className={styles.cardSubtitle}>
                Control when ticket sales open and who can view this tier.
              </p>
            </div>
            <div className={styles.timezoneBadge}>
              <Globe size={13} />
              <span>{timezone}</span>
            </div>
          </div>

          <div className={styles.cardBody}>
            {/* Start Date & Time */}
            <div className={styles.scheduleRow}>
              <div className={styles.scheduleLabel}>
                <span className={styles.scheduleHeading}>Sales Start</span>
                <span className={styles.scheduleSubheading}>
                  First date tickets can be booked
                </span>
              </div>
              <div className={styles.pickersBox}>
                <Popover>
                  <PopoverTrigger asChild>
                    <button type="button" className={styles.datePickerBtn}>
                      <CalendarIcon size={14} />
                      {saleStart ? (
                        format(new Date(saleStart), "PPP")
                      ) : (
                        <span>Pick a date</span>
                      )}
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 z-[9999]" align="start">
                    <Calendar
                      mode="single"
                      selected={saleStart ? new Date(saleStart) : undefined}
                      onSelect={(date) =>
                        updateDate(saleStart, date, setSaleStart)
                      }
                    />
                  </PopoverContent>
                </Popover>
                <div className={styles.timeDropdownWrapper}>
                  <Dropdown
                    options={TIME_OPTIONS}
                    value={
                      saleStart ? format(new Date(saleStart), "HH:mm") : "00:00"
                    }
                    onChange={(val) =>
                      updateTime(saleStart, val as string, setSaleStart)
                    }
                    btnColor="transparent"
                    maxHeight="250px"
                  />
                </div>
              </div>
            </div>

            <div className={styles.divider} />

            {/* End Date & Time */}
            <div className={styles.scheduleRow}>
              <div className={styles.scheduleLabel}>
                <span className={styles.scheduleHeading}>Sales End</span>
                <span className={styles.scheduleSubheading}>
                  Cut-off date when ticket sales close
                </span>
              </div>
              <div className={styles.pickersBox}>
                <Popover>
                  <PopoverTrigger asChild>
                    <button type="button" className={styles.datePickerBtn}>
                      <CalendarIcon size={14} />
                      {saleEnd ? (
                        format(new Date(saleEnd), "PPP")
                      ) : (
                        <span>Pick a date</span>
                      )}
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 z-[9999]" align="start">
                    <Calendar
                      mode="single"
                      selected={saleEnd ? new Date(saleEnd) : undefined}
                      onSelect={(date) => updateDate(saleEnd, date, setSaleEnd)}
                    />
                  </PopoverContent>
                </Popover>
                <div className={styles.timeDropdownWrapper}>
                  <Dropdown
                    options={TIME_OPTIONS}
                    value={
                      saleEnd ? format(new Date(saleEnd), "HH:mm") : "00:00"
                    }
                    onChange={(val) =>
                      updateTime(saleEnd, val as string, setSaleEnd)
                    }
                    btnColor="transparent"
                    maxHeight="250px"
                  />
                </div>
              </div>
            </div>

            <div className={styles.divider} />

            {/* Close Ticket Switch */}
            <div className={styles.switchRow}>
              <div className={styles.switchLabelBlock}>
                <span className={styles.switchTitle}>Close Ticket</span>
                <span className={styles.switchSubtext}>
                  Stops sales immediately for this ticket
                </span>
              </div>
              <Switch checked={isClosed} onChange={setIsClosed} />
            </div>

            <div className={styles.divider} />

            {/* Invite Only Switch */}
            <div className={styles.switchRow}>
              <div className={styles.switchLabelBlock}>
                <span className={styles.switchTitle}>Invite Only</span>
                <span className={styles.switchSubtext}>
                  Hide from public page; accessible only via direct link
                </span>
              </div>
              <Switch
                id="ticket-hidden-switch"
                checked={isHidden}
                onChange={setIsHidden}
              />
            </div>

            {/* Direct Link */}
            {directTicketUrl && (
              <div className={styles.formGroup}>
                <label className={styles.label}>
                  Single Ticket Direct Link
                </label>
                <div className={styles.urlBox}>
                  <input
                    type="text"
                    readOnly
                    className={styles.urlInput}
                    value={directTicketUrl}
                  />
                  <button
                    type="button"
                    className={`${styles.copyBtn} ${copiedUrl ? styles.copyBtnCopied : ""}`}
                    onClick={handleCopyUrl}
                  >
                    {copiedUrl ? <Check size={13} /> : <Copy size={13} />}
                    <span>{copiedUrl ? "Copied" : "Copy Link"}</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Card 5: Policies & Transfers */}
        <section className={styles.card}>
          <div className={styles.cardHeader}>
            <div className={styles.cardTitleGroup}>
              <h3 className={styles.cardTitle}>Policies & Transfers</h3>
              <p className={styles.cardSubtitle}>
                Attendee cancellation, refund, and transfer permissions.
              </p>
            </div>
          </div>

          <div className={styles.cardBody}>
            <div className={styles.switchRow}>
              <div className={styles.switchLabelBlock}>
                <span className={styles.switchTitle}>Allow Refunds</span>
                <span className={styles.switchSubtext}>
                  Allow attendees to request refunds for this ticket
                </span>
              </div>
              <Switch checked={isRefundable} onChange={setIsRefundable} />
            </div>

            <div className={styles.divider} />

            <div className={styles.switchRow}>
              <div className={styles.switchLabelBlock}>
                <span className={styles.switchTitle}>Allow Transfers</span>
                <span className={styles.switchSubtext}>
                  Allow attendees to transfer tickets to another person
                </span>
              </div>
              <Switch checked={isTransferable} onChange={setIsTransferable} />
            </div>

            {isTransferable && (
              <div className={styles.conditionalInputWrapper}>
                <label className={styles.label}>
                  Maximum Transfers Allowed
                </label>
                <Input
                  type="number"
                  placeholder="e.g. 1"
                  className={styles.input}
                  value={maxTransfers}
                  onChange={(e) => setMaxTransfers(e.target.value)}
                  min="1"
                  data-testid="ticket-max-transfers-input"
                />
              </div>
            )}
          </div>
        </section>

        {/* Card 6: Advanced Settings */}
        <section className={styles.card}>
          <div className={styles.cardHeader}>
            <div className={styles.cardTitleGroup}>
              <h3 className={styles.cardTitle}>Advanced Settings</h3>
              <p className={styles.cardSubtitle}>
                Category pool, tags, ticket code format, and visibility rules.
              </p>
            </div>
          </div>

          <div className={styles.cardBody}>
            {/* Ticket Code Prefix */}
            <div className={styles.formGroup}>
              <label className={styles.label}>Ticket Code Prefix</label>
              <Input
                type="text"
                placeholder="e.g. VIP, EXO"
                className={styles.input}
                maxLength={20}
                value={codePrefix}
                onChange={(e) => {
                  const val = e.target.value
                    .toUpperCase()
                    .replace(/[^A-Z0-9_-]/g, "");
                  setCodePrefix(val);
                }}
              />
              <span className={styles.helperText}>
                Optional prefix added to generated pass codes (e.g. &quot;VIP-&quot;).
              </span>
              {codePrefix && codePrefix.trim().length > 0 && (
                <div className={styles.codePreviewRow}>
                  <span className={styles.codePreviewLabel}>Preview:</span>
                  <span className={styles.codePreviewBadge}>
                    {`${codePrefix.trim().toUpperCase()}${"482910735194".slice(0, Math.min(12, Math.max(4, codeLength || 6)))}`}
                  </span>
                </div>
              )}
            </div>

            {/* Ticket Code Digits */}
            <div className={styles.formGroup}>
              <label className={styles.label}>Ticket Code Digits</label>
              <Input
                type="number"
                placeholder="6"
                className={styles.input}
                min="4"
                max="12"
                value={codeLength}
                onChange={(e) => {
                  const val = parseInt(e.target.value, 10);
                  if (!isNaN(val)) setCodeLength(val);
                }}
              />
              <span className={styles.helperText}>
                Length of the random number sequence (4 to 12 digits, default is 6).
              </span>
            </div>

            <div className={styles.divider} />

            {/* Category / Pool Name */}
            <div className={styles.formGroup}>
              <label className={styles.label}>Category / Pool Name</label>
              <Input
                type="text"
                placeholder="e.g. VIP, Track A, or Student Pool"
                className={styles.input}
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                data-testid="ticket-pool-name-input"
              />
              <span className={styles.helperText}>
                Share capacity across multiple tiers (e.g. Early Bird + Regular).
              </span>
            </div>

            {category.trim() && (
              <div className={styles.conditionalInputWrapper}>
                <label className={styles.label}>Shared Pool Capacity</label>
                <Input
                  type="number"
                  placeholder="Total capacity for this category pool"
                  className={styles.input}
                  value={poolCapacity}
                  onChange={(e) => setPoolCapacity(e.target.value)}
                  min="1"
                  data-testid="ticket-pool-capacity-input"
                />
                <span className={styles.helperText}>
                  Caps total registrations across all tiers in this pool.
                </span>
              </div>
            )}

            <div className={styles.divider} />

            {/* Organizer Tags */}
            <div className={styles.formGroup}>
              <label className={styles.label}>Tags (Comma-separated)</label>
              <Input
                type="text"
                placeholder="e.g. speaker, sponsor, early-access"
                className={styles.input}
                value={tagsInput}
                onChange={(e) => setTagsInput(e.target.value)}
              />
              <span className={styles.helperText}>
                Internal tags for attendee filtering and categorization.
              </span>
            </div>

            <div className={styles.divider} />

            {/* Form Question Visibility Rules */}
            <div className={styles.formGroup}>
              <label className={styles.label}>
                Conditions & Visibility Rules
              </label>
              <span className={styles.helperText}>
                Only attendees who submit matching answers on the registration form can view and select this tier.
              </span>
              <ConditionBuilder
                conditions={conditions}
                onChange={setConditions}
                availableFields={formFields}
              />
            </div>
          </div>
        </section>

        {/* Footer Quick Action: Jump to Pass Designer */}
        <div className={styles.footerActionBox}>
          <button
            type="button"
            className={styles.designLayoutBannerBtn}
            onClick={onSwitchToDesign}
            data-testid="modal-design-pass-btn"
          >
            <Palette size={16} />
            <span>Design Custom Pass Layout</span>
          </button>
        </div>
      </div>
    </div>
  );
}
