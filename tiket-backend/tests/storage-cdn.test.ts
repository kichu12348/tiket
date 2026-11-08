import { describe, expect, test, beforeEach, afterEach } from "bun:test";
import {
  buildStorageKey,
  buildFullCdnUrl,
} from "../src/services/storage.service";

describe("Storage & CDN URL Hierarchy", () => {
  const origR2PublicUrl = process.env.R2_PUBLIC_URL;
  const origCdnUrl = process.env.CDN_URL;

  beforeEach(() => {
    process.env.R2_PUBLIC_URL = "https://cdn.tiket.com";
    delete process.env.CDN_URL;
  });

  afterEach(() => {
    process.env.R2_PUBLIC_URL = origR2PublicUrl;
    process.env.CDN_URL = origCdnUrl;
  });

  test("1. buildStorageKey produces <eventId>/banner/<objectId>.webp with explicit objectId", () => {
    const key = buildStorageKey({
      eventId: "evt_123",
      objType: "banner",
      filename: "festival-hero.webp",
      objectId: "obj-abc",
    });
    expect(key).toBe("evt_123/banner/obj-abc.webp");
  });

  test("2. buildStorageKey produces <eventId>/ticket-template/<objectId>.png with uppercase extension normalized", () => {
    const key = buildStorageKey({
      eventId: "evt_456",
      objType: "ticket-template",
      filename: "VIP_PASS_ARTBOARD.PNG",
      objectId: "obj-def",
    });
    expect(key).toBe("evt_456/ticket-template/obj-def.png");
  });

  test("3. buildStorageKey produces <eventId>/email/<objectId>.jpg", () => {
    const key = buildStorageKey({
      eventId: "evt_789",
      objType: "email",
      filename: "invitation-header.jpg",
      objectId: "obj-ghi",
    });
    expect(key).toBe("evt_789/email/obj-ghi.jpg");
  });

  test("4. buildStorageKey defaults eventId to 'drafts' when omitted or whitespace", () => {
    const keyFromUndefined = buildStorageKey({
      objType: "banner",
      filename: "draft-photo.webp",
      objectId: "obj-jkl",
    });
    expect(keyFromUndefined).toBe("drafts/banner/obj-jkl.webp");

    const keyFromEmpty = buildStorageKey({
      eventId: "   ",
      objType: "banner",
      filename: "draft-photo.webp",
      objectId: "obj-jkl",
    });
    expect(keyFromEmpty).toBe("drafts/banner/obj-jkl.webp");
  });

  test("5. buildStorageKey generates a unique valid UUID when objectId is omitted", () => {
    const key = buildStorageKey({
      eventId: "evt_auto",
      objType: "banner",
      filename: "cover.jpeg",
    });
    const parts = key.split("/");
    expect(parts.length).toBe(3);
    expect(parts[0]).toBe("evt_auto");
    expect(parts[1]).toBe("banner");

    const lastPart = parts[2] || "";
    const [id, ext] = lastPart.split(".");
    expect(ext).toBe("jpeg");
    expect(id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
    );
  });

  test("6. buildFullCdnUrl returns full CDN URL from process.env.R2_PUBLIC_URL", () => {
    process.env.R2_PUBLIC_URL = "https://cdn.tiket.com";
    const url = buildFullCdnUrl("evt_123/banner/obj-abc.webp");
    expect(url).toBe("https://cdn.tiket.com/evt_123/banner/obj-abc.webp");
  });

  test("7. buildFullCdnUrl handles trailing slashes on domain and leading slashes on key without duplicates", () => {
    process.env.R2_PUBLIC_URL = "https://cdn.tiket.com/";
    const url = buildFullCdnUrl("/evt_123/ticket-template/obj-def.png");
    expect(url).toBe("https://cdn.tiket.com/evt_123/ticket-template/obj-def.png");
  });

  test("8. buildFullCdnUrl falls back to CDN_URL when R2_PUBLIC_URL is not set", () => {
    delete process.env.R2_PUBLIC_URL;
    process.env.CDN_URL = "https://assets.my-events.com";

    const url = buildFullCdnUrl("evt_789/email/obj-ghi.jpg");
    expect(url).toBe("https://assets.my-events.com/evt_789/email/obj-ghi.jpg");
  });
});
