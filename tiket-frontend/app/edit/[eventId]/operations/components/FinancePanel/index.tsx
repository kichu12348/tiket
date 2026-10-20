import { useState } from "react";
import type { Finance } from "@/types/commerce";
import { formatMoney, parseMinorUnits } from "@/lib/money";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import styles from "../../Operations.module.css";
export default function FinancePanel({ data, canRefund, disabled, onRefund }: { data: Finance; canRefund: boolean; disabled: boolean; onRefund: (id: string, amount: number, reason: string) => Promise<boolean> }) {
  const captured = data.capturedPaise;
  const refunded = data.refunds.filter(refund => refund.status === "processed").reduce((sum, refund) => sum + refund.amountPaise, 0);
  return <section className={styles.card}><h2>Payments & refunds</h2><p className={styles.muted}>Latest 500 orders · Captured {formatMoney(captured)} · Refunded {formatMoney(refunded)} · Net {formatMoney(captured - refunded)}</p>
    <div className={`${styles.list} scrollbar`}>{data.orders.map(({ order, attendee }) => {
      const refunds = data.refunds.filter(refund => refund.orderId === order.id);
      const balance = order.totalPaise - refunds.filter(refund => refund.status !== "failed").reduce((sum, refund) => sum + refund.amountPaise, 0);
      const items = data.items.filter(item => item.orderId === order.id);
      return <details className={styles.order} key={order.id}><summary>{attendee.name} · {formatMoney(order.totalPaise)} · {order.paymentStatus.replaceAll("_", " ")} · {order.registrationStatus.replaceAll("_", " ")}</summary>
        <p className={styles.muted}>{attendee.email} · Order {order.id}</p>
        {items.map(item => <p className={styles.breakdown} key={item.id}>{item.name}: {formatMoney(item.unitPricePaise)} − discount {formatMoney(item.discountPaise)} + ticket tax {formatMoney(item.ticketTaxPaise)} + fee {formatMoney(item.platformFeePaise)} + fee tax {formatMoney(item.feeTaxPaise)} = {formatMoney(item.totalPaise)}</p>)}
        {refunds.map(refund => <p key={refund.id} className={styles.muted}>Refund {formatMoney(refund.amountPaise)} · {refund.status} · {refund.reason}{refund.error ? ` · ${refund.error}` : ""}</p>)}
        {canRefund && order.paymentProvider === "razorpay" && ["success", "partially_refunded"].includes(order.paymentStatus) && balance > 0 && <RefundForm key={balance} balance={balance} disabled={disabled} submit={(amount, reason) => onRefund(order.id, amount, reason)} />}
      </details>;
    })}</div>
  </section>;
}
function RefundForm({ balance, disabled, submit }: { balance: number; disabled: boolean; submit: (amount: number, reason: string) => Promise<boolean> }) {
  const [amount, setAmount] = useState((balance / 100).toFixed(2)); const [reason, setReason] = useState(""); const [error, setError] = useState("");
  return <form className={styles.form} onSubmit={async event => { event.preventDefault(); try { const value = parseMinorUnits(amount); if (value <= 0 || value > balance) throw new Error("Amount must fit the remaining refundable balance."); setError(""); await submit(value, reason); } catch (err) { setError(err instanceof Error ? err.message : "Invalid refund."); } }}>
    <p className={styles.muted}>Refund up to {formatMoney(balance)}. Partial refunds retain admission; a full refund cancels the tickets.</p>
    <label>Refund amount (₹)<Input required inputMode="decimal" value={amount} onChange={event => setAmount(event.target.value)} /></label>
    <label>Reason<Input required maxLength={500} value={reason} onChange={event => setReason(event.target.value)} /></label>
    {error && <p role="alert">{error}</p>}<Button disabled={disabled} type="submit">Issue refund</Button>
  </form>;
}
