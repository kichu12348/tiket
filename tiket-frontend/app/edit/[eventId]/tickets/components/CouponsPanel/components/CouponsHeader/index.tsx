"use client";

import React from "react";
import { Plus } from "lucide-react";
import styles from "./CouponsHeader.module.css";

interface CouponsHeaderProps {
  onAddCoupon: () => void;
}

export default function CouponsHeader({ onAddCoupon }: CouponsHeaderProps) {
  return (
    <div className={styles.header}>
      <div className={styles.headerInfo}>
        <h2 className={styles.title}>Coupons & Discounts</h2>
        <p className={styles.subtitle}>
          Create promotional codes and discounts for attendee checkout.
        </p>
      </div>
      <button
        type="button"
        onClick={onAddCoupon}
        className={styles.addBtn}
        data-testid="add-coupon-btn"
      >
        <Plus size={16} />
        <span>Add Coupon</span>
      </button>
    </div>
  );
}
