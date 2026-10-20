import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from "node:crypto";
import nodemailer from "nodemailer";
import db from "@db";
import { emailConnections, events } from "@db/schema";
import { eq } from "drizzle-orm";
import { HttpError } from "../utils/errors";
import { lookup } from "node:dns/promises";

export type MailConfig =
  | { provider: "brevo"; apiKey: string; fromEmail: string; fromName?: string }
  | {
      provider: "smtp";
      host: string;
      port: number;
      secure: boolean;
      username: string;
      password: string;
      fromEmail: string;
      fromName?: string;
    };
function encryptionKey() {
  const key = Buffer.from(process.env.CREDENTIAL_ENCRYPTION_KEY || "", "hex");
  if (key.length !== 32)
    throw new HttpError(503, "Mail credential encryption is not configured.");
  return key;
}
export async function saveMailConfig(userId: string, config: MailConfig) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const encrypted = Buffer.concat([
    cipher.update(JSON.stringify(config), "utf8"),
    cipher.final(),
  ]);
  const encryptedConfig = [iv, cipher.getAuthTag(), encrypted]
    .map((value) => value.toString("base64"))
    .join(".");
  await db
    .insert(emailConnections)
    .values({ userId, encryptedConfig })
    .onConflictDoUpdate({
      target: emailConnections.userId,
      set: { encryptedConfig },
    });
}
async function configFor(eventId?: string): Promise<MailConfig> {
  if (eventId) {
    const [event] = await db
      .select()
      .from(events)
      .where(eq(events.id, eventId));
    const [connection] = event
      ? await db
          .select()
          .from(emailConnections)
          .where(eq(emailConnections.userId, event.organizationId))
      : [];
    if (connection) {
      const [iv, tag, encrypted] = connection.encryptedConfig
        .split(".")
        .map((value) => Buffer.from(value, "base64"));
      if (!iv || !tag || !encrypted)
        throw new Error("Invalid encrypted mail configuration.");
      const decipher = createDecipheriv("aes-256-gcm", encryptionKey(), iv);
      decipher.setAuthTag(tag);
      return JSON.parse(
        Buffer.concat([decipher.update(encrypted), decipher.final()]).toString(
          "utf8",
        ),
      ) as MailConfig;
    }
  }
  if (!process.env.BREVO_API_KEY || !process.env.EMAIL_FROM)
    throw new HttpError(503, "Email delivery is not configured.");
  return {
    provider: "brevo",
    apiKey: process.env.BREVO_API_KEY,
    fromEmail: process.env.EMAIL_FROM,
    fromName: process.env.EMAIL_FROM_NAME || "Tiket",
  };
}
export async function deliverMail(
  message: {
    recipientEmail: string;
    recipientName?: string;
    subject: string;
    body: string;
  },
  eventId?: string,
  key?: string,
) {
  const config = await configFor(eventId);
  if (config.provider === "brevo") {
    const response = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      signal: AbortSignal.timeout(15000),
      headers: { "api-key": config.apiKey, "content-type": "application/json" },
      body: JSON.stringify({
        sender: { email: config.fromEmail, name: config.fromName || "Tiket" },
        to: [{ email: message.recipientEmail, name: message.recipientName }],
        subject: message.subject,
        htmlContent: message.body,
        ...(key ? { headers: { idempotencyKey: mailCommandId(key) } } : {}),
      }),
    });
    if (!response.ok)
      throw new Error(`Brevo delivery returned ${response.status}.`);
  } else {
    const addresses = await lookup(config.host, { all: true });
    const blocked = (address: string) =>
      address.includes(":") ||
      /^(0\.|10\.|127\.|169\.254\.|172\.(1[6-9]|2\d|3[01])\.|192\.168\.|100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\.|198\.(18|19)\.|22[4-9]\.|2[3-5]\d\.)/.test(
        address,
      );
    if (
      !addresses.length ||
      addresses.some((record) => blocked(record.address))
    )
      throw new HttpError(
        400,
        "SMTP host must resolve to a public IPv4 address.",
      );
    // SMTP always requires TLS. Never accept self-signed certificates.
    const transport = nodemailer.createTransport({
      host: addresses[0]!.address,
      tls: { servername: config.host },
      port: config.port,
      secure: config.secure,
      requireTLS: true,
      auth: { user: config.username, pass: config.password },
      connectionTimeout: 10000,
      socketTimeout: 15000,
    });
    try {
      await transport.sendMail({
        from: { name: config.fromName || "Tiket", address: config.fromEmail },
        to: message.recipientEmail,
        subject: message.subject,
        html: message.body,
        ...(key ? { messageId: `<${key}@tiket.local>` } : {}),
      });
    } finally {
      transport.close();
    }
  }
}
function mailCommandId(value: string) {
  const hex = createHash("sha256").update(value).digest("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-8${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
}
