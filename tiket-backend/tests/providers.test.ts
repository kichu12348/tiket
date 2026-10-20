import { describe, expect, spyOn, test } from "bun:test";
import { deliverMail } from "../src/services/mail.service";
import { presignUpload } from "../src/services/storage.service";
describe("provider transport contracts without external delivery", () => {
  test("Brevo uses provider delivery and a stable UUID mail key", async () => {
    const oldKey = process.env.BREVO_API_KEY; const oldFrom = process.env.EMAIL_FROM;
    process.env.BREVO_API_KEY = "fixture-brevo"; process.env.EMAIL_FROM = "fixture@example.test";
    const fetcher = spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify({ messageId: "fixture" }), { status: 201 }));
    try {
      await deliverMail({ recipientEmail: "attendee@example.test", subject: "Fixture", body: "<p>Fixture</p>" }, undefined, "order:fixture:confirmation");
      const call = fetcher.mock.calls[0]!; expect(call[0]).toBe("https://api.brevo.com/v3/smtp/email");
      const body = JSON.parse(String(call[1]?.body)) as { headers: { idempotencyKey: string }; to: { email: string }[] };
      expect(body.headers.idempotencyKey).toMatch(/^[a-f0-9-]{36}$/); expect(body.to[0]?.email).toBe("attendee@example.test");
    } finally { fetcher.mockRestore(); if (oldKey === undefined) delete process.env.BREVO_API_KEY; else process.env.BREVO_API_KEY = oldKey; if (oldFrom === undefined) delete process.env.EMAIL_FROM; else process.env.EMAIL_FROM = oldFrom; }
  });
  test("browser R2 upload URL binds metadata and has a five-minute expiry", async () => {
    const keys = ["R2_ACCOUNT_ID", "R2_ACCESS_KEY_ID", "R2_SECRET_ACCESS_KEY", "R2_BUCKET"] as const;
    const previous = keys.map(key => process.env[key]);
    [process.env.R2_ACCOUNT_ID, process.env.R2_ACCESS_KEY_ID, process.env.R2_SECRET_ACCESS_KEY, process.env.R2_BUCKET] = ["fixture", "fixture-access", "fixture-secret", "fixture-bucket"];
    try {
      const url = new URL(await presignUpload("staging/fixture", "application/pdf", 123));
      expect(url.hostname).toBe("fixture.r2.cloudflarestorage.com"); expect(url.searchParams.get("X-Amz-Expires")).toBe("300");
      expect(url.searchParams.get("X-Amz-SignedHeaders")).toContain("content-type"); expect(url.searchParams.has("x-amz-checksum-crc32")).toBe(false);
    } finally { keys.forEach((key, i) => { if (previous[i] === undefined) delete process.env[key]; else process.env[key] = previous[i]; }); }
  });
});
