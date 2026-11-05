"use client";

import { useState, useCallback } from "react";
import type { TicketType } from "@/types/ticketType";
import type { VisibilityConditionRule } from "@/types/form";

interface UseTicketSettingsStateParams {
  initialTicket?: TicketType | null;
  registrationStart?: string | null;
  registrationEnd?: string | null;
  eventEndDate?: string | null;
  platformFeeBps?: number;
}

export function useTicketSettingsState({
  initialTicket,
  registrationStart,
  registrationEnd,
  eventEndDate,
  platformFeeBps = 400,
}: UseTicketSettingsStateParams) {
  const [name, setName] = useState(initialTicket?.name ?? "");
  const [description, setDescription] = useState(
    initialTicket?.description ?? "",
  );
  const [enableWaitlist, setEnableWaitlist] = useState(
    initialTicket?.enableWaitlist ?? false,
  );
  const [multiDayCheckIn, setMultiDayCheckIn] = useState(
    initialTicket?.multiDayCheckIn ?? false,
  );

  const [hasLimitCapacity, setHasLimitCapacity] = useState(
    initialTicket
      ? typeof initialTicket.quantityLimit === "number" &&
          initialTicket.quantityLimit > 0
      : true,
  );
  const [quantityLimit, setQuantityLimit] = useState(
    initialTicket?.quantityLimit?.toString() ?? "",
  );

  const [hasMaxPerUser, setHasMaxPerUser] = useState(
    typeof initialTicket?.maxPerUser === "number" &&
      initialTicket.maxPerUser > 0,
  );
  const [maxPerUser, setMaxPerUser] = useState(
    initialTicket?.maxPerUser?.toString() ?? "",
  );

  const [isFixedDefault, setIsFixedDefault] = useState(
    initialTicket?.isFixedDefault ?? false,
  );

  const initialPriceNum = initialTicket ? Number(initialTicket.price) : 0;
  const [isPaid, setIsPaid] = useState(
    initialTicket ? initialPriceNum > 0 : true,
  );
  const [price, setPrice] = useState(initialTicket?.price?.toString() ?? "");
  const [collectGst, setCollectGst] = useState(
    initialTicket?.collectGst ?? false,
  );
  const [passFeeToCustomer, setPassFeeToCustomer] = useState(
    initialTicket?.passFeeToCustomer ?? true,
  );

  const [isClosed, setIsClosed] = useState(initialTicket?.isClosed ?? false);
  const [isHidden, setIsHidden] = useState(initialTicket?.isHidden ?? false);

  const [saleStart, setSaleStart] = useState(
    () =>
      initialTicket?.saleStart ||
      registrationStart ||
      new Date().toISOString(),
  );
  const [saleEnd, setSaleEnd] = useState(
    () =>
      initialTicket?.saleEnd ||
      registrationEnd ||
      eventEndDate ||
      new Date(Date.now() + 86400000).toISOString(),
  );

  const [isRefundable, setIsRefundable] = useState(
    initialTicket?.isRefundable ?? false,
  );
  const [isTransferable, setIsTransferable] = useState(
    initialTicket?.isTransferable ?? true,
  );
  const [maxTransfers, setMaxTransfers] = useState(
    initialTicket?.maxTransfers?.toString() ?? "1",
  );

  const [category, setCategory] = useState(
    initialTicket?.category ?? initialTicket?.poolName ?? "",
  );
  const [poolCapacity, setPoolCapacity] = useState(
    initialTicket?.poolCapacity?.toString() ?? "",
  );
  const [tagsInput, setTagsInput] = useState(
    initialTicket?.tags?.join(", ") ?? "",
  );

  const initialConditions = (() => {
    if (initialTicket?.conditions && Array.isArray(initialTicket.conditions)) {
      return initialTicket.conditions;
    }
    if (
      initialTicket?.eligibilityRules?.rules &&
      Array.isArray(initialTicket.eligibilityRules.rules)
    ) {
      return initialTicket.eligibilityRules.rules.map(
        (r: { sourceId?: string; value?: unknown }) => ({
          fieldId: r.sourceId || "",
          allowedValues: Array.isArray(r.value)
            ? (r.value as string[])
            : r.value
              ? [String(r.value)]
              : [],
        }),
      );
    }
    return [];
  })();
  const [conditions, setConditions] =
    useState<VisibilityConditionRule[]>(initialConditions);

  // Live pricing calculations
  const feePercent = platformFeeBps / 100;
  const gatewayFeePercent = 2;
  const parsedPrice = isPaid ? Number(price) || 0 : 0;
  const unitPricePaise = Math.round(parsedPrice * 100);
  const feePaise = Math.round((unitPricePaise * platformFeeBps) / 10000);
  const feeRupees = feePaise / 100;
  const formatRupees = (val: number) =>
    val % 1 === 0 ? val.toFixed(0) : val.toFixed(2);
  const totalPriceForUser = passFeeToCustomer
    ? parsedPrice + feeRupees
    : parsedPrice;

  const validateSettings = useCallback((): {
    valid: boolean;
    error?: string;
  } => {
    if (!name.trim()) {
      return { valid: false, error: "Ticket name is required." };
    }
    if (isPaid && (price === "" || isNaN(Number(price)) || Number(price) < 0)) {
      return { valid: false, error: "Please enter a valid ticket price." };
    }
    if (!saleStart || !saleEnd) {
      return { valid: false, error: "Sale start and end dates are required." };
    }
    if (new Date(saleStart) >= new Date(saleEnd)) {
      return {
        valid: false,
        error: "Sale start date must be before end date.",
      };
    }
    return { valid: true };
  }, [name, isPaid, price, saleStart, saleEnd]);

  const resetSettingsState = useCallback(
    (t?: TicketType | null) => {
      if (!t) {
        setName("");
        setDescription("");
        setIsPaid(true);
        setPrice("");
        setCollectGst(false);
        setPassFeeToCustomer(true);
        setHasLimitCapacity(true);
        setQuantityLimit("");
        setHasMaxPerUser(false);
        setMaxPerUser("");
        setIsFixedDefault(false);
        setEnableWaitlist(false);
        setMultiDayCheckIn(false);
        setIsClosed(false);
        setIsHidden(false);
        setSaleStart(registrationStart || new Date().toISOString());
        setSaleEnd(
          registrationEnd ||
            eventEndDate ||
            new Date(Date.now() + 86400000).toISOString(),
        );
        setIsRefundable(false);
        setIsTransferable(true);
        setMaxTransfers("1");
        setCategory("");
        setPoolCapacity("");
        setTagsInput("");
        setConditions([]);
      } else {
        setName(t.name);
        setDescription(t.description ?? "");
        const priceNum = Number(t.price);
        setIsPaid(priceNum > 0);
        setPrice(t.price?.toString() ?? "");
        setCollectGst(t.collectGst ?? false);
        setPassFeeToCustomer(t.passFeeToCustomer ?? true);
        setHasLimitCapacity(
          typeof t.quantityLimit === "number" && t.quantityLimit > 0,
        );
        setQuantityLimit(t.quantityLimit?.toString() ?? "");
        setHasMaxPerUser(typeof t.maxPerUser === "number" && t.maxPerUser > 0);
        setMaxPerUser(t.maxPerUser?.toString() ?? "");
        setIsFixedDefault(t.isFixedDefault ?? false);
        setEnableWaitlist(t.enableWaitlist ?? false);
        setMultiDayCheckIn(t.multiDayCheckIn ?? false);
        setIsClosed(t.isClosed ?? false);
        setIsHidden(t.isHidden ?? false);
        setSaleStart(t.saleStart || new Date().toISOString());
        setSaleEnd(
          t.saleEnd || new Date(Date.now() + 86400000).toISOString(),
        );
        setIsRefundable(t.isRefundable ?? false);
        setIsTransferable(t.isTransferable ?? true);
        setMaxTransfers(t.maxTransfers?.toString() ?? "1");
        setCategory(t.category ?? t.poolName ?? "");
        setPoolCapacity(t.poolCapacity?.toString() ?? "");
        setTagsInput(t.tags?.join(", ") ?? "");
        setConditions(
          t.conditions && Array.isArray(t.conditions) ? t.conditions : [],
        );
      }
    },
    [registrationStart, registrationEnd, eventEndDate],
  );

  return {
    name,
    setName,
    description,
    setDescription,
    enableWaitlist,
    setEnableWaitlist,
    multiDayCheckIn,
    setMultiDayCheckIn,
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
    isPaid,
    setIsPaid,
    price,
    setPrice,
    collectGst,
    setCollectGst,
    passFeeToCustomer,
    setPassFeeToCustomer,
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
    tagsInput,
    setTagsInput,
    conditions,
    setConditions,
    feePercent,
    gatewayFeePercent,
    parsedPrice,
    feeRupees,
    formatRupees,
    totalPriceForUser,
    validateSettings,
    resetSettingsState,
  };
}
