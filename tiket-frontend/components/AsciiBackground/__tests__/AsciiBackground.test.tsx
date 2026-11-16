import "@/happydom";
import { describe, expect, test } from "bun:test";
import React from "react";

// Bridge duplicate React instances between root @testing-library/react and frontend node_modules/react
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const rFrontend = require("react");
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const rTesting = require(
    require.resolve("react", {
      paths: [require.resolve("@testing-library/react")],
    }),
  );
  const i1 =
    rFrontend.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE;
  const i2 =
    rTesting.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE;
  if (i1 && i2 && i1 !== i2) {
    Object.defineProperty(i1, "H", {
      get() {
        return i2.H;
      },
      set(v) {
        i2.H = v;
      },
    });
    Object.defineProperty(i1, "A", {
      get() {
        return i2.A;
      },
      set(v) {
        i2.A = v;
      },
    });
  }
} catch {
  // Ignore if already unified
}

import { render, screen } from "@testing-library/react";
import AsciiBackground from "../index";
import {
  lerp,
  getWaveColor,
  drawAsciiWaveFrame,
  type PointerState,
} from "../functions/asciiWaveEngine";

describe("AsciiBackground Component & Engine", () => {
  test("lerp accurately interpolates between values", () => {
    expect(lerp(0, 100, 0.5)).toBe(50);
    expect(lerp(10, 20, 0)).toBe(10);
    expect(lerp(10, 20, 1)).toBe(20);
  });

  test("getWaveColor returns proper RGB values for upper and lower waves", () => {
    const upperColor = getWaveColor(0.2, true);
    expect(upperColor).toHaveProperty("r");
    expect(upperColor).toHaveProperty("g");
    expect(upperColor).toHaveProperty("b");
    expect(upperColor.r).toBeGreaterThan(0);

    const lowerColorLeft = getWaveColor(0.2, false);
    expect(lowerColorLeft.r).toBeGreaterThan(0);

    const lowerColorMid = getWaveColor(0.6, false);
    expect(lowerColorMid.g).toBeGreaterThan(0);

    const lowerColorRight = getWaveColor(0.9, false);
    expect(lowerColorRight.b).toBeDefined();
  });

  test("drawAsciiWaveFrame executes without error against canvas context mock", () => {
    const fillRectMock = () => {};
    const fillTextMock = () => {};
    const mockCtx = {
      fillStyle: "",
      font: "",
      textAlign: "",
      textBaseline: "",
      fillRect: fillRectMock,
      fillText: fillTextMock,
    } as unknown as CanvasRenderingContext2D;

    const pointer: PointerState = {
      x: 100,
      y: 100,
      targetX: 100,
      targetY: 100,
      active: true,
    };

    expect(() => {
      drawAsciiWaveFrame(mockCtx, 800, 600, 1000, pointer);
    }).not.toThrow();
  });

  test("renders canvas and vignette elements in the DOM", () => {
    render(<AsciiBackground />);
    expect(screen.getByTestId("ascii-canvas")).toBeDefined();
    expect(screen.getByTestId("ascii-vignette")).toBeDefined();
  });
});
