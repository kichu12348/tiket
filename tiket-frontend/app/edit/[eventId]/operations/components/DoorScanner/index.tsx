import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import styles from "../../Operations.module.css";
export default function DoorScanner({ disabled, scan }: { disabled: boolean; scan: (value: string) => Promise<boolean> }) {
  const [code, setCode] = useState("");
  return <section className={styles.card}><h2>Door check-in</h2><p className={styles.muted}>Scan into the field with a USB/Bluetooth QR scanner, or paste the pass QR value. Only paid, approved and active tickets for this event can enter.</p><form className={styles.form} onSubmit={async event => { event.preventDefault(); if (await scan(code.trim())) setCode(""); }}><label>Ticket QR code<Input required autoComplete="off" value={code} onChange={event => setCode(event.target.value)} /></label><Button disabled={disabled || !code.trim()}>Check in</Button></form></section>;
}
