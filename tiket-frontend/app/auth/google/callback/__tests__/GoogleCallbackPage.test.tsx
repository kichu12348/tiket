import "@/happydom";
import { describe, expect, test, mock, beforeEach, afterEach } from "bun:test";
import React from "react";
import { render, waitFor } from "@testing-library/react";

let mockSearchParams = new URLSearchParams();
const mockRouter = {
  replace: mock(),
  push: mock(),
};

mock.module("next/navigation", () => ({
  useRouter: () => mockRouter,
  useSearchParams: () => mockSearchParams,
}));

// Mock api/auth syncSessionToken
mock.module("@/api/auth", () => ({
  syncSessionToken: mock(async () => {}),
  getGoogleOAuthUrl: mock(() => "http://localhost:5000/api/auth/google"),
}));

import GoogleCallbackPage from "../page";

describe("GoogleCallbackPage", () => {
  beforeEach(() => {
    mockSearchParams = new URLSearchParams();
    mockRouter.replace.mockClear();
    mockRouter.push.mockClear();
  });

  afterEach(() => {
    Object.defineProperty(window, "opener", {
      value: undefined,
      configurable: true,
      writable: true,
    });
  });

  test("in popup mode with window.opener, posts message and closes window", async () => {
    mockSearchParams.set("token", "jwt-mock-token-xyz");
    mockSearchParams.set("mode", "popup");
    mockSearchParams.set("redirect", "/dashboard");

    const postMessageMock = mock();
    const closeMock = mock();

    Object.defineProperty(window, "opener", {
      value: { postMessage: postMessageMock },
      configurable: true,
      writable: true,
    });
    window.close = closeMock;

    render(<GoogleCallbackPage />);

    await waitFor(() => {
      expect(postMessageMock).toHaveBeenCalledWith(
        {
          type: "TIKET_GOOGLE_AUTH_SUCCESS",
          token: "jwt-mock-token-xyz",
        },
        window.location.origin,
      );
      expect(closeMock).toHaveBeenCalled();
    });
  });

  test("in redirect mode, navigates to safe redirect url", async () => {
    mockSearchParams.set("token", "jwt-mock-token-abc");
    mockSearchParams.set("mode", "redirect");
    mockSearchParams.set("redirect", "/events/hackathon");

    render(<GoogleCallbackPage />);

    await waitFor(() => {
      expect(mockRouter.replace).toHaveBeenCalledWith("/events/hackathon");
    });
  });

  test("sanitizes unsafe open redirects and falls back to /home", async () => {
    mockSearchParams.set("token", "jwt-mock-token-abc");
    mockSearchParams.set("mode", "redirect");
    mockSearchParams.set("redirect", "https://malicious-site.com");

    render(<GoogleCallbackPage />);

    await waitFor(() => {
      expect(mockRouter.replace).toHaveBeenCalledWith("/home");
    });
  });
});
