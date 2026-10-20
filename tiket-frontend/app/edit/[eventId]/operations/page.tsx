"use client";
import { useParams } from "next/navigation";
import { useOperations } from "@/hooks/useOperations";
import { useLiveStore } from "@/store/useLiveStore";
import { useAvailability } from "@/hooks/useAvailability";
import FinancePanel from "./components/FinancePanel";
import CouponPanel from "./components/CouponPanel";
import MailConnection from "./components/MailConnection";
import DoorScanner from "./components/DoorScanner";
import { Button } from "@/components/ui/button";
import styles from "./Operations.module.css";
export default function OperationsPage() {
  const { eventId } = useParams<{ eventId: string }>();
  const ops = useOperations(eventId); const live = useLiveStore(state => state.status); const availability = useAvailability(eventId);
  return <div className={styles.page}>
    <header><h1>Event operations</h1><p className={styles.muted}>{live === "live" ? "Live updates connected" : "Refreshing every 15 seconds"} · {availability?.remaining === null ? "Unlimited capacity" : availability ? `${availability.remaining} spots available` : "Loading capacity…"}</p></header>
    {ops.error && <p role="alert" className={styles.error}>{ops.error}</p>}
    {ops.loading && <p>Loading operations…</p>}
    {ops.permissions.includes("scan_tickets") && <DoorScanner disabled={ops.busy} scan={ops.scan} />}
    {ops.permissions.includes("manage_guests") && <section className={styles.card}><h2>Awaiting approval</h2><p className={styles.muted}>Paid registrations reserve a spot after capture. Declining releases the spot and refunds the remaining captured balance.</p>{ops.approvals.length === 0 && <p>No pending approvals.</p>}{ops.approvals.map(item => <div className={styles.row} key={item.id}><div>{item.name}<p className={styles.muted}>{item.email}</p></div><div className={styles.actions}><Button disabled={ops.busy} onClick={() => ops.decide(item.id, "approve")}>Approve</Button><Button disabled={ops.busy} variant="secondary" onClick={() => ops.decide(item.id, "decline")}>Decline & refund</Button></div></div>)}</section>}
    {ops.finance && <FinancePanel data={ops.finance} canRefund={ops.permissions.includes("manage_refunds")} disabled={ops.busy} onRefund={ops.refund} />}
    {ops.permissions.includes("manage_tickets") && <CouponPanel coupons={ops.coupons} tiers={availability?.tiers || []} disabled={ops.busy} save={ops.saveCoupon} />}
    {ops.owner && <MailConnection custom={ops.customMail} disabled={ops.busy} save={ops.saveMail} reset={ops.resetMail} />}
  </div>;
}
