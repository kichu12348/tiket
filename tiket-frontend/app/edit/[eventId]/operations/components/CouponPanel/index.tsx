import { useState } from "react";
import type { Coupon } from "@/types/commerce";
import type { TicketType } from "@/types/ticketType";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { parseMinorUnits } from "@/lib/money";
import styles from "../../Operations.module.css";
import DateTimeControl from "../DateTimeControl";
export default function CouponPanel({ coupons, tiers, disabled, save }: { coupons: Coupon[]; tiers: TicketType[]; disabled: boolean; save: (coupon: Coupon) => Promise<boolean> }) {
  const [code, setCode] = useState(""); const [kind, setKind] = useState<Coupon["kind"]>("percent"); const [value, setValue] = useState("10"); const [maxUses, setMaxUses] = useState(""); const [selected, setSelected] = useState<string[]>([]); const [start, setStart] = useState(""); const [end, setEnd] = useState(""); const [error, setError] = useState("");
  return <section className={styles.card}><h2>Coupons & access codes</h2><p className={styles.muted}>Codes can unlock hidden ticket tiers. A usage is reserved during checkout and retained by a confirmed registration.</p>
    {coupons.map(coupon => <div className={styles.row} key={coupon.code}><span>{coupon.code} · {coupon.kind} · {coupon.isActive ? "Active" : "Disabled"}</span><Button variant="secondary" disabled={disabled} onClick={() => save({ ...coupon, isActive: !coupon.isActive })}>{coupon.isActive ? "Disable" : "Enable"}</Button></div>)}
    <form className={styles.form} onSubmit={async event => { event.preventDefault(); try { const amount = kind === "access" ? 0 : parseMinorUnits(value); if (kind === "percent" && amount > 10000) throw new Error("Percentage cannot exceed 100%."); setError(""); await save({ code, kind, value: amount, ticketTypeIds: selected, maxUses: maxUses ? Number(maxUses) : null, startsAt: start ? new Date(start).toISOString() : null, endsAt: end ? new Date(end).toISOString() : null, isActive: true }); } catch (err) { setError(err instanceof Error ? err.message : "Invalid code."); } }}>
      <label>Code<Input required pattern="[A-Za-z0-9_-]{2,64}" value={code} onChange={event => setCode(event.target.value.toUpperCase())} /></label>
      <label>Type<Select value={kind} onValueChange={value => { if (value === "percent" || value === "fixed" || value === "access") setKind(value); }}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="percent">Percentage discount</SelectItem><SelectItem value="fixed">Fixed discount</SelectItem><SelectItem value="access">Access only</SelectItem></SelectContent></Select></label>
      {kind !== "access" && <label>{kind === "percent" ? "Discount (%)" : "Discount (₹)"}<Input required inputMode="decimal" value={value} onChange={event => setValue(event.target.value)} /></label>}
      <label>Maximum registrations (blank for unlimited)<Input type="number" min={1} step={1} value={maxUses} onChange={event => setMaxUses(event.target.value)} /></label>
      <p className={styles.muted}>Optional sale window. Times use your browser timezone.</p>
      <div className={styles.grid}><DateTimeControl label="Starts at" value={start} onChange={setStart} /><DateTimeControl label="Ends at" value={end} onChange={setEnd} /></div>
      <p className={styles.muted}>Eligible ticket tiers (none selected means all)</p>
      {tiers.map(tier => <label key={tier.id} className={styles.row}><span>{tier.name}</span><Checkbox checked={selected.includes(tier.id)} onCheckedChange={checked => setSelected(previous => checked === true ? [...previous, tier.id] : previous.filter(id => id !== tier.id))} /></label>)}
      {error && <p role="alert">{error}</p>}<Button type="submit" disabled={disabled}>Save code</Button>
    </form>
  </section>;
}
