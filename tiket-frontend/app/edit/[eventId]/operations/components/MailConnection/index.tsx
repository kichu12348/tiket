import { useState } from "react";
import type { MailConfig } from "@/types/commerce";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import styles from "../../Operations.module.css";
export default function MailConnection({ custom, disabled, save, reset }: { custom: boolean; disabled: boolean; save: (config: MailConfig) => Promise<boolean>; reset: () => Promise<boolean> }) {
  const [provider, setProvider] = useState<"brevo" | "smtp">("brevo"); const [apiKey, setApiKey] = useState(""); const [fromEmail, setFromEmail] = useState(""); const [fromName, setFromName] = useState(""); const [host, setHost] = useState(""); const [port, setPort] = useState("587"); const [username, setUsername] = useState(""); const [password, setPassword] = useState("");
  return <section className={styles.card}><h2>Email delivery</h2><p className={styles.muted}>{custom ? "Using your custom connection." : "Using platform Brevo delivery."} Your connection applies to all events you organize. Saved credentials are encrypted and never returned to the browser.</p>
    {custom && <Button variant="secondary" disabled={disabled} onClick={reset}>Use platform Brevo</Button>}
    <form className={styles.form} onSubmit={async event => { event.preventDefault(); const config: MailConfig = provider === "brevo" ? { provider, apiKey, fromEmail, fromName } : { provider, host, port: Number(port), secure: port === "465", username, password, fromEmail, fromName }; if (await save(config)) { setApiKey(""); setPassword(""); } }}>
      <label>Provider<Select value={provider} onValueChange={value => { if (value === "brevo" || value === "smtp") setProvider(value); }}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="brevo">Brevo</SelectItem><SelectItem value="smtp">Custom SMTP</SelectItem></SelectContent></Select></label>
      <label>Sender email<Input type="email" required value={fromEmail} onChange={event => setFromEmail(event.target.value)} /></label><label>Sender name<Input value={fromName} onChange={event => setFromName(event.target.value)} /></label>
      {provider === "brevo" ? <label>Brevo API key<Input type="password" autoComplete="new-password" required value={apiKey} onChange={event => setApiKey(event.target.value)} /></label> : <>
        <label>SMTP host<Input required value={host} onChange={event => setHost(event.target.value)} /></label>
        <label>Port<Select value={port} onValueChange={setPort}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="587">587 · STARTTLS</SelectItem><SelectItem value="465">465 · TLS</SelectItem><SelectItem value="2525">2525 · STARTTLS</SelectItem></SelectContent></Select></label>
        <label>Username<Input required value={username} onChange={event => setUsername(event.target.value)} /></label><label>Password<Input required type="password" autoComplete="new-password" value={password} onChange={event => setPassword(event.target.value)} /></label>
      </>}
      <Button type="submit" disabled={disabled}>Save email connection</Button>
    </form>
  </section>;
}
