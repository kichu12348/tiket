import "@/happydom";
import { describe, expect, test, mock, beforeEach, afterEach } from "bun:test";
import React from "react";
import { render, waitFor } from "@testing-library/react";

import { testRouterState } from "@/testing-library";

let mockSearch: {
  token?: string;
  redirect?: string;
  mode?: string;
  error?: string;
} = {};
const mockNavigate = mock();

// Mock api/auth syncSessionToken
mock.module("@/api/auth", () => ({
  syncSessionToken: mock(async () => {}),
  getGoogleOAuthUrl: mock(() => "http://localhost:5000/api/auth/google"),
}));

import GoogleCallbackPage from "@/app/auth/google/callback/page";

describe("GoogleCallbackPage", () => {
  beforeEach(() => {
    mockSearch = {};
    Object.defineProperty(testRouterState, "search", {
      get: () => mockSearch,
      configurable: true,
    });
    testRouterState.navigate = mockNavigate;
    mockNavigate.mockClear();
  });

  afterEach(() => {
    Object.defineProperty(window, "opener", {
      value: undefined,
      configurable: true,
      writable: true,
    });
  });

  test("in popup mode with window.opener, posts message and closes window", async () => {
    mockSearch = {
      token: "jwt-mock-token-xyz",
      mode: "popup",
      redirect: "/dashboard",
    };

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
    mockSearch = {
      token: "jwt-mock-token-abc",
      mode: "redirect",
      redirect: "/events/hackathon",
    };

    render(<GoogleCallbackPage />);

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith({
        to: "/events/hackathon",
        replace: true,
      });
    });
  });

  test("sanitizes unsafe open redirects and falls back to /home", async () => {
    mockSearch = {
      token: "jwt-mock-token-abc",
      mode: "redirect",
      redirect: "https://malicious-site.com",
    };

    render(<GoogleCallbackPage />);

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith({
        to: "/home",
        replace: true,
      });
    });
  });
});
