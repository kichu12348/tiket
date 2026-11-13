import type {
  CreateTicketTypePayload,
  TicketLayoutConfig,
} from "@/types/ticketType";
import type { useTicketSettingsState } from "../hooks/useTicketSettingsState";

export interface BuildTicketPayloadParams {
  settings: ReturnType<typeof useTicketSettingsState>;
  finalImageUrl: string | null;
  config: TicketLayoutConfig;
}

/**
 * Normalizes user settings and layout configuration into the CreateTicketTypePayload format.
 */
export function buildTicketPayload({
  settings,
  finalImageUrl,
  config,
}: BuildTicketPayloadParams): CreateTicketTypePayload {
  const parsedTags = settings.tagsInput
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);

  const validRules = settings.conditions.rules.filter(
    (c) => c.fieldId && c.allowedValues.length > 0,
  );
  const validConditions =
    validRules.length > 0
      ? {
          match: settings.conditions.match || "all",
          rules: validRules,
        }
      : null;

  return {
    name: settings.name.trim(),
    description: settings.description.trim() || undefined,
    price: settings.isPaid ? Number(settings.price) : 0,
    passFeeToCustomer: settings.isPaid ? settings.passFeeToCustomer : false,
    quantityLimit:
      settings.hasLimitCapacity && settings.quantityLimit
        ? parseInt(settings.quantityLimit, 10)
        : null,
    maxPerUser:
      settings.hasMaxPerUser && settings.maxPerUser
        ? parseInt(settings.maxPerUser, 10)
        : null,
    enableWaitlist: settings.enableWaitlist,
    multiDayCheckIn: settings.multiDayCheckIn,
    isFixedDefault: settings.isFixedDefault,
    collectGst: settings.isPaid ? settings.collectGst : false,
    isClosed: settings.isClosed,
    isHidden: settings.isHidden,
    category: settings.category.trim() || null,
    poolName: settings.category.trim() || null,
    poolCapacity: settings.poolCapacity
      ? parseInt(settings.poolCapacity, 10)
      : null,
    codePrefix: settings.codePrefix.trim().toUpperCase() || "",
    codeLength: settings.codeLength || 6,
    maxCheckInsPerDay: settings.multiDayCheckIn
      ? settings.maxCheckInsPerDay
      : 1,
    tags: parsedTags,
    conditions: validConditions,
    saleStart: settings.saleStart,
    saleEnd: settings.saleEnd,
    isRefundable: settings.isRefundable,
    isTransferable: settings.isTransferable,
    maxTransfers: settings.isTransferable
      ? parseInt(settings.maxTransfers, 10) || 1
      : 0,
    templateImageUrl: finalImageUrl,
    templateConfig: config,
  };
}
