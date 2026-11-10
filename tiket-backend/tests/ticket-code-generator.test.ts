import { describe, expect, test } from "bun:test";
import { generateUniqueTicketCode } from "../src/services/checkout.service";

describe("Collision-Safe Ticket Code Generator", () => {
  test("generates ticket code with custom prefix and specified length", async () => {
    const reserved = new Set<string>();
    const code = await generateUniqueTicketCode(
      null,
      { prefix: "EXO-", digits: 6 },
      reserved,
    );

    expect(code).toMatch(/^EXO-\d{6}$/);
    expect(reserved.has(code)).toBe(true);
  });

  test("generates ticket code with empty prefix and custom digit length", async () => {
    const reserved = new Set<string>();
    const code = await generateUniqueTicketCode(
      null,
      { prefix: "", digits: 8 },
      reserved,
    );

    expect(code).toMatch(/^\d{8}$/);
    expect(reserved.has(code)).toBe(true);
  });

  test("normalizes prefix by trimming whitespace and converting to uppercase", async () => {
    const reserved = new Set<string>();
    const code = await generateUniqueTicketCode(
      null,
      { prefix: "  vip-pass_  ", digits: 5 },
      reserved,
    );

    expect(code).toMatch(/^VIP-PASS_\d{5}$/);
  });

  test("clamps digits between minimum 4 and maximum 12", async () => {
    const reserved = new Set<string>();

    // Below min (e.g. 2 digits) clamps to 4
    const codeMin = await generateUniqueTicketCode(
      null,
      { prefix: "TKT-", digits: 2 },
      reserved,
    );
    expect(codeMin).toMatch(/^TKT-\d{4}$/);

    // Above max (e.g. 15 digits) clamps to 12
    const codeMax = await generateUniqueTicketCode(
      null,
      { prefix: "TKT-", digits: 15 },
      reserved,
    );
    expect(codeMax).toMatch(/^TKT-\d{12}$/);
  });

  test("handles collisions when candidate is in reservedInBatch", async () => {
    const reserved = new Set<string>();

    // Generate 50 codes in sequence and ensure no duplicates
    for (let i = 0; i < 50; i++) {
      const code = await generateUniqueTicketCode(
        null,
        { prefix: "BATCH-", digits: 4 },
        reserved,
      );
      expect(code).toMatch(/^BATCH-\d{4,}$/);
    }

    expect(reserved.size).toBe(50);
  });

  test("generates non-colliding code when previous candidate collision is simulated", async () => {
    const reserved = new Set<string>();
    // Pre-seed reserved with a prefix match
    reserved.add("EXO-000000");

    const code = await generateUniqueTicketCode(
      null,
      { prefix: "EXO-", digits: 6 },
      reserved,
    );

    expect(code).not.toBe("EXO-000000");
    expect(code).toMatch(/^EXO-\d{6}$/);
    expect(reserved.size).toBe(2);
  });
});

