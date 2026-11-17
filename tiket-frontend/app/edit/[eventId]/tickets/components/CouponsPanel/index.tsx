
import React from "react";
import CouponsHeader from "./components/CouponsHeader";
import CouponsTable from "./components/CouponsTable";
import CouponModal from "./components/CouponModal";
import { useCoupons } from "./hooks/useCoupons";
import styles from "./CouponsPanel.module.css";

interface CouponsPanelProps {
  eventId: string;
  onCountChange?: (count: number) => void;
}

export default function CouponsPanel({
  eventId,
  onCountChange,
}: CouponsPanelProps) {
  const {
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
  } = useCoupons({ eventId, onCountChange });

  return (
    <div className={styles.container}>
      <CouponsHeader onAddCoupon={handleOpenCreate} />
      <CouponsTable
        coupons={coupons}
        loading={loading}
        onOpenCreate={handleOpenCreate}
        onOpenEdit={handleOpenEdit}
        onToggleActive={handleToggleActive}
        onDelete={handleDelete}
      />
      <CouponModal
        isOpen={isModalOpen}
        ticketTypes={ticketTypes}
        editingCoupon={editingCoupon}
        isSubmitting={isSubmitting}
        onClose={handleCloseModal}
        onSave={handleSaveCoupon}
      />
    </div>
  );
}
