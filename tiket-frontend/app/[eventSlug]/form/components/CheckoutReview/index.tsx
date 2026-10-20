import Link from "next/link";
import type { CreateOrderResponse } from "@/types/order";
import { Button } from "@/components/ui/button";
import styles from "./CheckoutReview.module.css";
const money = (paise: number) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(paise / 100);
export default function CheckoutReview({ data, remaining, busy, error, pay, cancel, restart }: { data: CreateOrderResponse; remaining: number | null; busy: boolean; error: string; pay: () => void; cancel: () => void; restart: () => void }) {
  const { order, items, tickets } = data;
  const confirmed = ["confirmed", "pending_approval"].includes(order.registrationStatus);
  const sum = (key: "unitPricePaise" | "discountPaise" | "ticketTaxPaise" | "platformFeePaise" | "feeTaxPaise") => items.reduce((total, line) => total + line[key], 0);
  return <section className={styles.card} aria-live="polite">
    <h2>{confirmed ? order.registrationStatus === "pending_approval" ? "Awaiting approval" : "Registration confirmed" : order.reservationState === "held" ? "Review your order" : "Checkout ended"}</h2>
    <p>{confirmed ? order.registrationStatus === "pending_approval" ? "Your payment is captured and your spot is reserved. The organizer must approve your registration before you can enter." : "Your entry pass is ready." : order.registrationStatus === "refund_pending" ? "A payment arrived after the reservation ended. An automatic refund is being processed." : order.reservationState === "held" ? "Your spot is reserved while you complete payment." : "Your reservation has been released. Any late captured payment will be refunded."}</p>
    {order.reservationState === "held" && <strong>Time remaining: {remaining === null ? "…" : `${Math.floor(remaining / 60)}:${String(remaining % 60).padStart(2, "0")}`}</strong>}
    <dl className={styles.breakdown}>
      <div><dt>Tickets</dt><dd>{money(sum("unitPricePaise"))}</dd></div>
      <div><dt>Discount</dt><dd>−{money(sum("discountPaise"))}</dd></div>
      <div><dt>Ticket tax</dt><dd>{money(sum("ticketTaxPaise"))}</dd></div>
      <div><dt>Platform fee</dt><dd>{money(sum("platformFeePaise"))}</dd></div>
      <div><dt>Tax on fee</dt><dd>{money(sum("feeTaxPaise"))}</dd></div>
      <div><dt>Total</dt><dd>{money(order.totalPaise)}</dd></div>
    </dl>
    <p>Payment: {order.paymentStatus.replaceAll("_", " ")}</p>
    {error && <p role="alert">{error}</p>}
    {confirmed ? tickets.map(ticket => <Link key={ticket.id} href={`/passes/${ticket.id}`}>View {order.registrationStatus === "pending_approval" ? "registration" : "pass"}</Link>) : order.reservationState === "held" ? <>
      <Button type="button" disabled={busy || remaining === 0 || !data.razorpayOrder} onClick={pay}>{busy ? "Checking payment…" : data.razorpayOrder ? `Pay ${money(order.totalPaise)}` : "Initializing payment…"}</Button>
      <Button type="button" variant="secondary" disabled={busy} onClick={cancel}>Cancel reservation</Button>
    </> : <Button type="button" onClick={restart}>Start a new registration</Button>}
  </section>;
}
