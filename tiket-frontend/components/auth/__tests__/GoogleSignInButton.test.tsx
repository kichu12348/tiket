import "@/happydom";
import { describe, expect, test, mock, afterEach } from "bun:test";
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";

import { testRouterState } from "@/testing-library";

// Mock @tanstack/react-router
const mockNavigate = mock();
testRouterState.navigate = mockNavigate;

import { GoogleSignInButton } from "../GoogleSignInButton";

describe("GoogleSignInButton", () => {
  const originalOpen = window.open;

  afterEach(() => {
    window.open = originalOpen;
  });

  test("renders button with default text and Google icon", () => {
    render(<GoogleSignInButton />);
    const button = screen.getByRole("button", { name: /continue with google/i });
    expect(button).toBeDefined();
    expect(button.querySelector("svg")).not.toBeNull();
  });

  test("renders custom children if provided", () => {
    render(<GoogleSignInButton>Sign in using Google</GoogleSignInButton>);
    expect(
      screen.getByRole("button", { name: /sign in using google/i }),
    ).toBeDefined();
  });

  test("opens centered popup on click when mode is popup", () => {
    let openedUrl = "";
    let openedTarget = "";
    let openedFeatures = "";

    window.open = (url?: string | URL, target?: string, features?: string) => {
      openedUrl = url?.toString() || "";
      openedTarget = target || "";
      openedFeatures = features || "";
      return {
        closed: false,
        close: () => {},
      } as Window;
    };

    render(
      <GoogleSignInButton
        redirect="/dashboard"
        mode="popup"
      />,
    );

    const button = screen.getByRole("button", { name: /continue with google/i });
    fireEvent.click(button);

    expect(openedUrl).toContain("/api/auth/google");
    expect(openedUrl).toContain("mode=popup");
    expect(openedUrl).toContain("redirect=%2Fdashboard");
    expect(openedTarget).toBe("tiket_google_auth_window");
    expect(openedFeatures).toContain("width=500");
    expect(openedFeatures).toContain("height=620");
  });

  test("falls back to full redirect if popup is blocked", () => {
    window.open = () => null;

    let assignedUrl = "";
    const originalLocation = window.location;
    Object.defineProperty(window, "location", {
      value: {
        ...originalLocation,
        set href(val: string) {
          assignedUrl = val;
        },
        get href() {
          return assignedUrl;
        },
      },
      configurable: true,
      writable: true,
    });

    try {
      render(
        <GoogleSignInButton
          redirect="/events/test"
          mode="popup"
        />,
      );

      const button = screen.getByRole("button", { name: /continue with google/i });
      fireEvent.click(button);

      expect(assignedUrl).toContain("/api/auth/google");
      expect(assignedUrl).toContain("mode=redirect");
    } finally {
      Object.defineProperty(window, "location", {
        value: originalLocation,
        configurable: true,
        writable: true,
      });
    }
  });
});
