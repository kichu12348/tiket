import { describe, expect, test } from "bun:test";
import { evaluateCheckInRules } from "../src/utils/admission";
import { HttpError } from "../src/utils/errors";

describe("Multi-Day & Daily Multi-Entry Check-In Engine", () => {
  const baseRecord = {
    payment: "success",
    ticketStatus: "active",
    multiDayCheckIn: false,
    maxCheckInsPerDay: 1,
  };

  describe("1. Single-Use Tickets (multiDayCheckIn = false, maxCheckInsPerDay = 1)", () => {
    test("allows initial scan on unused ticket", () => {
      const res = evaluateCheckInRules(baseRecord, [], "2026-11-10");
      expect(res.todayCheckIns).toBe(0);
      expect(res.totalCheckIns).toBe(0);
    });

    test("blocks immediate duplicate scan within 3000ms debounce guard", () => {
      const now = new Date();
      const existing = [
        {
          id: "ci-1",
          checkInDate: "2026-11-10",
          checkedInAt: new Date(now.getTime() - 500),
        },
      ];

      expect(() =>
        evaluateCheckInRules(
          { ...baseRecord, ticketStatus: "used" },
          existing,
          "2026-11-10",
        ),
      ).toThrow(new HttpError(409, "Ticket was just scanned moments ago."));
    });

    test("blocks second scan on same day once debounced", () => {
      const existing = [
        {
          id: "ci-1",
          checkInDate: "2026-11-10",
          checkedInAt: new Date(Date.now() - 5000),
        },
      ];

      expect(() =>
        evaluateCheckInRules(
          { ...baseRecord, ticketStatus: "used" },
          existing,
          "2026-11-10",
          { skipDebounce: true },
        ),
      ).toThrow(new HttpError(409, "Ticket has already been checked in."));
    });

    test("blocks scan on subsequent day for single-use ticket", () => {
      const existing = [
        {
          id: "ci-1",
          checkInDate: "2026-11-10",
          checkedInAt: new Date(Date.now() - 86400000),
        },
      ];

      expect(() =>
        evaluateCheckInRules(
          { ...baseRecord, ticketStatus: "used" },
          existing,
          "2026-11-11",
          { skipDebounce: true },
        ),
      ).toThrow(new HttpError(409, "Ticket has already been checked in."));
    });

    test("rejects unpaid or non-active/used tickets", () => {
      expect(() =>
        evaluateCheckInRules(
          { ...baseRecord, payment: "pending" },
          [],
          "2026-11-10",
        ),
      ).toThrow(
        new HttpError(409, "Ticket is not eligible for this admission change."),
      );

      expect(() =>
        evaluateCheckInRules(
          { ...baseRecord, ticketStatus: "cancelled" },
          [],
          "2026-11-10",
        ),
      ).toThrow(
        new HttpError(409, "Ticket is not eligible for this admission change."),
      );
    });
  });

  describe("2. Multi-Day Once Per Day (multiDayCheckIn = true, maxCheckInsPerDay = 1)", () => {
    const multiDay1xRecord = {
      ...baseRecord,
      multiDayCheckIn: true,
      maxCheckInsPerDay: 1,
    };

    test("allows 1st scan on Day 1, blocks 2nd scan on Day 1", () => {
      // 1st scan on Day 1
      const res1 = evaluateCheckInRules(multiDay1xRecord, [], "2026-11-10");
      expect(res1.todayCheckIns).toBe(0);
      expect(res1.totalCheckIns).toBe(0);

      // 2nd scan on Day 1
      const existing = [
        {
          id: "ci-1",
          checkInDate: "2026-11-10",
          checkedInAt: new Date(Date.now() - 10000),
        },
      ];

      expect(() =>
        evaluateCheckInRules(
          { ...multiDay1xRecord, ticketStatus: "used" },
          existing,
          "2026-11-10",
          { skipDebounce: true },
        ),
      ).toThrow(
        new HttpError(409, "Daily check-in limit (1) reached for 2026-11-10."),
      );
    });

    test("allows 1st scan on Day 2, blocks 2nd scan on Day 2", () => {
      const day1CheckIn = {
        id: "ci-1",
        checkInDate: "2026-11-10",
        checkedInAt: new Date(Date.now() - 86400000),
      };

      // 1st scan on Day 2
      const res2 = evaluateCheckInRules(
        { ...multiDay1xRecord, ticketStatus: "used" },
        [day1CheckIn],
        "2026-11-11",
        { skipDebounce: true },
      );
      expect(res2.todayCheckIns).toBe(0);
      expect(res2.totalCheckIns).toBe(1);

      // 2nd scan on Day 2
      const day2CheckIn = {
        id: "ci-2",
        checkInDate: "2026-11-11",
        checkedInAt: new Date(Date.now() - 5000),
      };

      expect(() =>
        evaluateCheckInRules(
          { ...multiDay1xRecord, ticketStatus: "used" },
          [day2CheckIn, day1CheckIn],
          "2026-11-11",
          { skipDebounce: true },
        ),
      ).toThrow(
        new HttpError(409, "Daily check-in limit (1) reached for 2026-11-11."),
      );
    });
  });

  describe("3. Multi-Day Multi-Entry Per Day (multiDayCheckIn = true, maxCheckInsPerDay = 3)", () => {
    const multiDay3xRecord = {
      ...baseRecord,
      multiDayCheckIn: true,
      maxCheckInsPerDay: 3,
    };

    test("permits up to 3 scans on Day 1 and enforces limit on 4th scan", () => {
      const checkIns: Array<{
        id: string;
        checkInDate: string;
        checkedInAt: Date;
      }> = [];

      // Scan 1
      const res1 = evaluateCheckInRules(
        multiDay3xRecord,
        checkIns,
        "2026-11-10",
        { skipDebounce: true },
      );
      expect(res1.todayCheckIns).toBe(0);
      checkIns.unshift({
        id: "ci-1",
        checkInDate: "2026-11-10",
        checkedInAt: new Date(Date.now() - 30000),
      });

      // Scan 2
      const res2 = evaluateCheckInRules(
        { ...multiDay3xRecord, ticketStatus: "used" },
        checkIns,
        "2026-11-10",
        { skipDebounce: true },
      );
      expect(res2.todayCheckIns).toBe(1);
      checkIns.unshift({
        id: "ci-2",
        checkInDate: "2026-11-10",
        checkedInAt: new Date(Date.now() - 20000),
      });

      // Scan 3
      const res3 = evaluateCheckInRules(
        { ...multiDay3xRecord, ticketStatus: "used" },
        checkIns,
        "2026-11-10",
        { skipDebounce: true },
      );
      expect(res3.todayCheckIns).toBe(2);
      checkIns.unshift({
        id: "ci-3",
        checkInDate: "2026-11-10",
        checkedInAt: new Date(Date.now() - 10000),
      });

      // Scan 4 — Rejects
      expect(() =>
        evaluateCheckInRules(
          { ...multiDay3xRecord, ticketStatus: "used" },
          checkIns,
          "2026-11-10",
          { skipDebounce: true },
        ),
      ).toThrow(
        new HttpError(409, "Daily check-in limit (3) reached for 2026-11-10."),
      );
    });

    test("resets daily quota on Day 2 while retaining total check-in count", () => {
      const day1CheckIns = [
        {
          id: "ci-3",
          checkInDate: "2026-11-10",
          checkedInAt: new Date(Date.now() - 86400000 + 3000),
        },
        {
          id: "ci-2",
          checkInDate: "2026-11-10",
          checkedInAt: new Date(Date.now() - 86400000 + 2000),
        },
        {
          id: "ci-1",
          checkInDate: "2026-11-10",
          checkedInAt: new Date(Date.now() - 86400000 + 1000),
        },
      ];

      const resDay2 = evaluateCheckInRules(
        { ...multiDay3xRecord, ticketStatus: "used" },
        day1CheckIns,
        "2026-11-11",
        { skipDebounce: true },
      );
      expect(resDay2.todayCheckIns).toBe(0);
      expect(resDay2.totalCheckIns).toBe(3);
    });
  });

  describe("4. Single-Day Multi-Entry (multiDayCheckIn = false, maxCheckInsPerDay = 2)", () => {
    const singleDay2xRecord = {
      ...baseRecord,
      multiDayCheckIn: false,
      maxCheckInsPerDay: 2,
    };

    test("allows multiple scans on the same day up to maxCheckInsPerDay", () => {
      const existing = [
        {
          id: "ci-1",
          checkInDate: "2026-11-10",
          checkedInAt: new Date(Date.now() - 5000),
        },
      ];

      const res = evaluateCheckInRules(
        { ...singleDay2xRecord, ticketStatus: "used" },
        existing,
        "2026-11-10",
        { skipDebounce: true },
      );
      expect(res.todayCheckIns).toBe(1);

      const existing2 = [
        {
          id: "ci-2",
          checkInDate: "2026-11-10",
          checkedInAt: new Date(Date.now() - 4000),
        },
        ...existing,
      ];
      expect(() =>
        evaluateCheckInRules(
          { ...singleDay2xRecord, ticketStatus: "used" },
          existing2,
          "2026-11-10",
          { skipDebounce: true },
        ),
      ).toThrow(
        new HttpError(409, "Daily check-in limit (2) reached for 2026-11-10."),
      );
    });

    test("strictly rejects usage on subsequent day when multiDayCheckIn is false", () => {
      const existing = [
        {
          id: "ci-1",
          checkInDate: "2026-11-10",
          checkedInAt: new Date(Date.now() - 86400000),
        },
      ];

      expect(() =>
        evaluateCheckInRules(
          { ...singleDay2xRecord, ticketStatus: "used" },
          existing,
          "2026-11-11",
          { skipDebounce: true },
        ),
      ).toThrow(new HttpError(409, "Ticket was already used on a previous day."));
    });
  });

  describe("5. Unlimited Daily Re-Entry (multiDayCheckIn = true, maxCheckInsPerDay = null)", () => {
    const unlimitedRecord = {
      ...baseRecord,
      multiDayCheckIn: true,
      maxCheckInsPerDay: null,
    };

    test("allows arbitrary number of check-ins across multiple days without quota error", () => {
      const checkIns = Array.from({ length: 8 }, (_, i) => ({
        id: `ci-${i}`,
        checkInDate: "2026-11-10",
        checkedInAt: new Date(Date.now() - (10 - i) * 5000),
      })).reverse();

      const res = evaluateCheckInRules(
        { ...unlimitedRecord, ticketStatus: "used" },
        checkIns,
        "2026-11-10",
        { skipDebounce: true },
      );
      expect(res.todayCheckIns).toBe(8);
      expect(res.totalCheckIns).toBe(8);

      const resNextDay = evaluateCheckInRules(
        { ...unlimitedRecord, ticketStatus: "used" },
        checkIns,
        "2026-11-11",
        { skipDebounce: true },
      );
      expect(resNextDay.todayCheckIns).toBe(0);
      expect(resNextDay.totalCheckIns).toBe(8);
    });
  });
});

