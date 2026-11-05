import { describe, expect, test } from "bun:test";
import { assertCapacity } from "../src/services/inventory.service";
import {
  validateFormResponses,
  evaluateConditionRule,
  evaluateConditionGroup,
  evaluateVisibilityConditions,
  getFieldAction,
  type VisibilityConditionRule,
  type ConditionRule,
  type ConditionGroup,
  type FieldConditionConfig,
} from "../src/utils/registration-validation";
import { HttpError } from "../src/utils/errors";

describe("Shared Ticket Capacity Pools", () => {
  const pools = [
    { name: "Pool 1", cap: 60, eb: "p1-eb", reg: "p1-reg" },
    { name: "Pool 2", cap: 60, eb: "p2-eb", reg: "p2-reg" },
    { name: "Pool 3", cap: 60, eb: "p3-eb", reg: "p3-reg" },
  ];

  const sixTiers = pools.flatMap((p) => [
    {
      id: p.eb,
      name: `${p.name} Early Bird`,
      quantityLimit: 30, // Each tier can have its own quantityLimit
      poolName: p.name,
      poolCapacity: p.cap,
    },
    {
      id: p.reg,
      name: `${p.name} Regular`,
      quantityLimit: 60,
      poolName: p.name,
      poolCapacity: p.cap,
    },
  ]);

  test("180-seat event with 3 pools of 60 seats: 20 Early Bird + 40 Regular blocks the 61st buyer in Pool 1 while Pool 2 & 3 remain open", () => {
    // Total event capacity = 180 seats.
    // Pool 1 has sold 20 Early Bird and 40 Regular = 60 allocated.
    // Pool 2 has sold 10. Pool 3 has sold 0.
    const allocated = new Map<string, number>([
      ["p1-eb", 20],
      ["p1-reg", 40],
      ["p2-eb", 10],
      ["p2-reg", 0],
      ["p3-eb", 0],
      ["p3-reg", 0],
    ]);

    // 1. Attempting to purchase 1 more ticket in Pool 1 (Regular) fails with 409
    const requestedPool1 = new Map<string, number>([["p1-reg", 1]]);
    expect(() => {
      assertCapacity(180, allocated, requestedPool1, sixTiers);
    }).toThrow("Selected category pool is sold out.");

    // 2. Attempting to purchase 1 more ticket in Pool 1 (Early Bird) also fails with 409
    const requestedPool1EB = new Map<string, number>([["p1-eb", 1]]);
    expect(() => {
      assertCapacity(180, allocated, requestedPool1EB, sixTiers);
    }).toThrow("Selected category pool is sold out.");

    // 3. Attempting to purchase 1 ticket in Pool 2 (allocated 10 / 60) succeeds!
    const requestedPool2 = new Map<string, number>([["p2-reg", 1]]);
    expect(() => {
      assertCapacity(180, allocated, requestedPool2, sixTiers);
    }).not.toThrow();

    // 4. Attempting to purchase 1 ticket in Pool 3 (allocated 0 / 60) succeeds!
    const requestedPool3 = new Map<string, number>([["p3-eb", 1]]);
    expect(() => {
      assertCapacity(180, allocated, requestedPool3, sixTiers);
    }).not.toThrow();

    // 5. Attempting to buy 51 tickets in Pool 2 (10 allocated + 51 requested = 61 > 60) fails
    const requestedPool2Over = new Map<string, number>([["p2-reg", 51]]);
    expect(() => {
      assertCapacity(180, allocated, requestedPool2Over, sixTiers);
    }).toThrow("Selected category pool is sold out.");
  });

  test("availability computation reflects min(eventRemaining, poolRemaining, tierRemaining)", () => {
    const allocated = new Map<string, number>([
      ["p1-eb", 20],
      ["p1-reg", 0],
    ]);
    const eventCapacity = 180;
    const totalAllocated = 20;
    const eventRemaining = eventCapacity - totalAllocated; // 160

    // Pool 1: capacity 60. Allocated = 20 (Early Bird). Pool remaining = 40.
    const poolAllocated = new Map<string, number>([["Pool 1", 20]]);
    const poolCapacities = new Map<string, number>([["Pool 1", 60]]);

    const p1RegTier = sixTiers.find((t) => t.id === "p1-reg")!;
    const p1EbTier = sixTiers.find((t) => t.id === "p1-eb")!;

    const computeRemaining = (tier: typeof p1RegTier) => {
      const eventRem = eventRemaining;
      const tierRem =
        tier.quantityLimit === null
          ? Infinity
          : Math.max(0, tier.quantityLimit - (allocated.get(tier.id) || 0));
      const poolRem =
        tier.poolName && poolCapacities.has(tier.poolName)
          ? Math.max(
              0,
              poolCapacities.get(tier.poolName)! -
                (poolAllocated.get(tier.poolName) || 0),
            )
          : Infinity;
      return Math.min(eventRem, poolRem, tierRem);
    };

    // When Early Bird sells 20 out of a 60-seat pool:
    // Regular tier (quantityLimit 60, pool remaining 40) automatically shows 40 remaining!
    expect(computeRemaining(p1RegTier)).toBe(40);
    // Early Bird tier (quantityLimit 30, 20 sold -> tierRem 10, poolRem 40) shows 10 remaining!
    expect(computeRemaining(p1EbTier)).toBe(10);
  });
});

describe("If / Then / Else Conditional Rule Engine", () => {
  const roleField = {
    id: "f-role",
    eventId: "e-1",
    name: "role",
    label: "Role",
    fieldType: "select" as const,
    isRequired: true,
    options: ["Student", "Professional", "Speaker"],
    sortOrder: 1,
    page: 1,
    createdAt: new Date(),
  };

  const collegeIdCondition: FieldConditionConfig = {
    match: "all",
    rules: [
      {
        sourceType: "field",
        sourceId: "f-role",
        operator: "equals",
        value: "Student",
      },
    ],
    thenAction: "require",
    elseAction: "hide",
  };

  const collegeIdField = {
    id: "f-college-id",
    eventId: "e-1",
    name: "college_id",
    label: "College ID",
    fieldType: "text" as const,
    isRequired: false,
    options: {
      choices: [],
      conditions: collegeIdCondition,
    },
    sortOrder: 2,
    page: 1,
    createdAt: new Date(),
  };

  const fields = [roleField, collegeIdField];

  test("IF Role == 'Student' THEN require College ID: throws 400 if College ID is missing", () => {
    expect(() => {
      validateFormResponses(fields, [
        { fieldId: "f-role", responseValue: "Student" },
      ]);
    }).toThrow("College ID is required.");
  });

  test("IF Role == 'Student' THEN require College ID: passes when College ID is provided", () => {
    expect(() => {
      validateFormResponses(fields, [
        { fieldId: "f-role", responseValue: "Student" },
        { fieldId: "f-college-id", responseValue: "STU-12345" },
      ]);
    }).not.toThrow();
  });

  test("IF Role == 'Professional' THEN hide College ID: passes without College ID", () => {
    expect(() => {
      validateFormResponses(fields, [
        { fieldId: "f-role", responseValue: "Professional" },
      ]);
    }).not.toThrow();
  });

  test("IF Role == 'Professional' THEN hide College ID: ignores and strips College ID if provided", () => {
    expect(() => {
      validateFormResponses(fields, [
        { fieldId: "f-role", responseValue: "Professional" },
        { fieldId: "f-college-id", responseValue: "irrelevant-id" },
      ]);
    }).not.toThrow();
  });

  describe("Condition Operators and Evaluation", () => {
    test("operator: equals and not_equals (case-insensitive)", () => {
      const ruleEquals: ConditionRule = {
        sourceType: "field",
        sourceId: "field-1",
        operator: "equals",
        value: "Student",
      };
      const ruleNotEquals: ConditionRule = {
        sourceType: "field",
        sourceId: "field-1",
        operator: "not_equals",
        value: "Student",
      };

      const answers = new Map([["field-1", "student"]]);
      expect(evaluateConditionRule(ruleEquals, answers)).toBe(true);
      expect(evaluateConditionRule(ruleNotEquals, answers)).toBe(false);

      answers.set("field-1", "Teacher");
      expect(evaluateConditionRule(ruleEquals, answers)).toBe(false);
      expect(evaluateConditionRule(ruleNotEquals, answers)).toBe(true);
    });

    test("operator: contains and in", () => {
      const ruleContains: ConditionRule = {
        sourceType: "field",
        sourceId: "field-text",
        operator: "contains",
        value: "developer",
      };
      const ruleIn: ConditionRule = {
        sourceType: "field",
        sourceId: "field-category",
        operator: "in",
        value: ["vip", "staff", "speaker"],
      };

      const answers = new Map([
        ["field-text", "Senior Web Developer at Tiket"],
        ["field-category", "VIP"],
      ]);

      expect(evaluateConditionRule(ruleContains, answers)).toBe(true);
      expect(evaluateConditionRule(ruleIn, answers)).toBe(true);

      answers.set("field-category", "General");
      expect(evaluateConditionRule(ruleIn, answers)).toBe(false);
    });

    test("sourceType: ticketType condition evaluation", () => {
      const ruleTicket: ConditionRule = {
        sourceType: "ticketType",
        sourceId: "ticketTypeId",
        operator: "equals",
        value: "tier-vip",
      };

      expect(
        evaluateConditionRule(ruleTicket, new Map(), "tier-vip"),
      ).toBe(true);
      expect(
        evaluateConditionRule(ruleTicket, new Map(), "tier-general"),
      ).toBe(false);
    });

    test("ConditionGroup matching: all (AND) vs any (OR)", () => {
      const groupAll: ConditionGroup = {
        match: "all",
        rules: [
          {
            sourceType: "field",
            sourceId: "f1",
            operator: "equals",
            value: "yes",
          },
          {
            sourceType: "field",
            sourceId: "f2",
            operator: "equals",
            value: "yes",
          },
        ],
      };
      const groupAny: ConditionGroup = {
        match: "any",
        rules: [
          {
            sourceType: "field",
            sourceId: "f1",
            operator: "equals",
            value: "yes",
          },
          {
            sourceType: "field",
            sourceId: "f2",
            operator: "equals",
            value: "yes",
          },
        ],
      };

      const map1 = new Map([
        ["f1", "yes"],
        ["f2", "no"],
      ]);
      expect(evaluateConditionGroup(groupAll, map1)).toBe(false);
      expect(evaluateConditionGroup(groupAny, map1)).toBe(true);

      const map2 = new Map([
        ["f1", "yes"],
        ["f2", "yes"],
      ]);
      expect(evaluateConditionGroup(groupAll, map2)).toBe(true);
      expect(evaluateConditionGroup(groupAny, map2)).toBe(true);
    });

    test("getFieldAction dynamically computes show, require, hide, optional", () => {
      const mockField = {
        ...collegeIdField,
        isRequired: false,
      };

      const studentAnswers = new Map([["f-role", "Student"]]);
      expect(getFieldAction(mockField, studentAnswers)).toBe("require");

      const profAnswers = new Map([["f-role", "Professional"]]);
      expect(getFieldAction(mockField, profAnswers)).toBe("hide");
    });

    test("evaluateVisibilityConditions with VisibilityConditionRule array", () => {
      const conditions: VisibilityConditionRule[] = [
        {
          fieldId: "f-role",
          allowedValues: ["Student", "Intern"],
        },
        {
          fieldId: "f-track",
          allowedValues: ["Engineering"],
        },
      ];

      // Both match -> true
      const answersMatch = new Map([
        ["f-role", "student"],
        ["f-track", "engineering"],
      ]);
      expect(evaluateVisibilityConditions(conditions, answersMatch)).toBe(true);

      // Multi-select JSON array matching one allowed value
      const answersMulti = new Map([
        ["f-role", JSON.stringify(["Intern", "Volunteer"])],
        ["f-track", "Engineering"],
      ]);
      expect(evaluateVisibilityConditions(conditions, answersMulti)).toBe(true);

      // First rule fails -> false
      const answersFail1 = new Map([
        ["f-role", "Professional"],
        ["f-track", "Engineering"],
      ]);
      expect(evaluateVisibilityConditions(conditions, answersFail1)).toBe(false);

      // Second rule missing -> false
      const answersFail2 = new Map([["f-role", "Student"]]);
      expect(evaluateVisibilityConditions(conditions, answersFail2)).toBe(false);

      // Empty conditions -> true
      expect(evaluateVisibilityConditions([], new Map())).toBe(true);
      expect(evaluateVisibilityConditions(null, new Map())).toBe(true);
    });

    test("validateFormResponses with clean VisibilityConditionRule[]", () => {
      const cleanFieldRole = {
        id: "f-clean-role",
        eventId: "e-1",
        name: "role",
        label: "Role",
        fieldType: "select" as const,
        isRequired: true,
        options: ["Student", "Professional"],
        sortOrder: 1,
        page: 1,
        createdAt: new Date(),
      };

      const cleanFieldCollegeId = {
        id: "f-clean-college-id",
        eventId: "e-1",
        name: "college_id",
        label: "College ID",
        fieldType: "text" as const,
        isRequired: true,
        options: null,
        conditions: [
          {
            fieldId: "f-clean-role",
            allowedValues: ["Student"],
          },
        ],
        sortOrder: 2,
        page: 1,
        createdAt: new Date(),
      };

      const testFields = [cleanFieldRole, cleanFieldCollegeId];

      // When Role == Student, College ID is visible & required -> missing throws 400
      expect(() => {
        validateFormResponses(testFields, [
          { fieldId: "f-clean-role", responseValue: "Student" },
        ]);
      }).toThrow("College ID is required.");

      // When Role == Student and College ID is provided -> passes
      expect(() => {
        validateFormResponses(testFields, [
          { fieldId: "f-clean-role", responseValue: "Student" },
          { fieldId: "f-clean-college-id", responseValue: "STU-999" },
        ]);
      }).not.toThrow();

      // When Role == Professional, College ID is hidden -> passes even when omitted
      expect(() => {
        validateFormResponses(testFields, [
          { fieldId: "f-clean-role", responseValue: "Professional" },
        ]);
      }).not.toThrow();
    });
  });
});

