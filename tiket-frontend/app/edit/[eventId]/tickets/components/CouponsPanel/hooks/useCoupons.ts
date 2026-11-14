"use client";

import { useState, useEffect, useCallback } from "react";
import type { Coupon } from "@/types/commerce";
import type { TicketType } from "@/types/ticketType";
import {
  getCoupons,
  createCoupon,
  updateCoupon,
  deleteCoupon,
} from "@/api/commerce";
import { getTicketTypes } from "@/api/tickets";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/errors";

interface UseCouponsOptions {
  eventId: string;
  onCountChange?: (count: number) => void;
}

export function useCoupons({ eventId, onCountChange }: UseCouponsOptions) {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [ticketTypes, setTicketTypes] = useState<TicketType[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState<Coupon | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchCoupons = useCallback(async () => {
    try {
      const data = await getCoupons(eventId);
      const list = Array.isArray(data) ? data : [];
      setCoupons(list);
      onCountChange?.(list.length);
    } catch (err: unknown) {
      console.error("Failed to load coupons", err);
      toast.error(getErrorMessage(err) || "Failed to load coupons.");
    } finally {
      setLoading(false);
    }
  }, [eventId, onCountChange]);

  const fetchTicketTypes = useCallback(async () => {
    try {
      const data = await getTicketTypes(eventId);
      if (Array.isArray(data)) {
        setTicketTypes(data);
      }
    } catch (err: unknown) {
      console.error("Failed to load ticket types for coupons", err);
    }
  }, [eventId]);

  useEffect(() => {
    let isCancelled = false;
    getCoupons(eventId)
      .then((data) => {
        if (!isCancelled) {
          const list = Array.isArray(data) ? data : [];
          setCoupons(list);
          onCountChange?.(list.length);
        }
      })
      .catch((err: unknown) => {
        if (!isCancelled) {
          console.error("Failed to load coupons", err);
          toast.error(getErrorMessage(err) || "Failed to load coupons.");
        }
      })
      .finally(() => {
        if (!isCancelled) {
          setLoading(false);
        }
      });

    getTicketTypes(eventId)
      .then((data) => {
        if (!isCancelled && Array.isArray(data)) {
          setTicketTypes(data);
        }
      })
      .catch((err: unknown) => {
        if (!isCancelled) {
          console.error("Failed to load ticket types for coupons", err);
        }
      });

    return () => {
      isCancelled = true;
    };
  }, [eventId, onCountChange]);

  const handleOpenCreate = () => {
    setEditingCoupon(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (coupon: Coupon) => {
    setEditingCoupon(coupon);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingCoupon(null);
  };

  const handleSaveCoupon = async (payload: Coupon) => {
    try {
      setIsSubmitting(true);
      if (editingCoupon) {
        await updateCoupon(
          eventId,
          editingCoupon.id || editingCoupon.code,
          payload,
        );
        toast.success(`Coupon ${payload.code} updated.`);
      } else {
        await createCoupon(eventId, payload);
        toast.success(`Coupon ${payload.code} created.`);
      }

      handleCloseModal();
      await fetchCoupons();
    } catch (err: unknown) {
      console.error("Failed to save coupon", err);
      toast.error(getErrorMessage(err) || "Failed to save coupon.");
      throw err;
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleActive = async (coupon: Coupon, checked: boolean) => {
    try {
      setCoupons((prev) =>
        prev.map((c) =>
          c.id === coupon.id || c.code === coupon.code
            ? { ...c, isActive: checked }
            : c,
        ),
      );

      const updatedPayload: Coupon = {
        ...coupon,
        isActive: checked,
      };

      await updateCoupon(
        eventId,
        coupon.id || coupon.code,
        updatedPayload,
      );
      toast.success(
        `Coupon ${coupon.code} ${checked ? "activated" : "deactivated"}.`,
      );
    } catch (err: unknown) {
      console.error("Failed to update coupon status", err);
      toast.error(getErrorMessage(err) || "Failed to update coupon status.");
      // Rollback on error
      fetchCoupons();
    }
  };

  const handleDelete = async (coupon: Coupon) => {
    try {
      await deleteCoupon(eventId, coupon.id || coupon.code);
      setCoupons((prev) => {
        const next = prev.filter(
          (c) => c.id !== coupon.id && c.code !== coupon.code,
        );
        onCountChange?.(next.length);
        return next;
      });
      toast.success(`Coupon ${coupon.code} deleted.`);
    } catch (err: unknown) {
      console.error("Failed to delete coupon", err);
      toast.error(getErrorMessage(err) || "Failed to delete coupon.");
    }
  };

  return {
    coupons,
    ticketTypes,
    loading,
    isModalOpen,
    editingCoupon,
    isSubmitting,
    handleOpenCreate,
    handleOpenEdit,
    handleCloseModal,
    handleSaveCoupon,
    handleToggleActive,
    handleDelete,
    refetch: fetchCoupons,
    refetchTicketTypes: fetchTicketTypes,
  };
}
