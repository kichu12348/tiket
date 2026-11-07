import "@/happydom";
import { describe, expect, test, beforeEach, afterEach, jest } from "bun:test";

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

import { renderHook, act } from "@testing-library/react";
import api, {
  getClientToken,
  setClientToken,
  clearClientToken,
  resetClientTokenCache,
} from "@/lib/api";
import * as getTokenModule from "@/lib/getToken";
import * as removeTokenModule from "@/actions/removeToken";
import * as nextNavigation from "next/navigation";
import { useToken } from "@/hooks/useToken";
import type { InternalAxiosRequestConfig, AxiosResponse } from "axios";
import { AxiosError, AxiosHeaders } from "axios";

describe("API In-Memory Token Cache & Deduplication", () => {
  let getTokenCalls = 0;
  let getTokenSpy: ReturnType<typeof jest.spyOn>;
  let removeTokenSpy: ReturnType<typeof jest.spyOn>;
  let routerSpy: ReturnType<typeof jest.spyOn>;
  const mockPush = jest.fn();
  const originalAdapter = api.defaults.adapter;

  beforeEach(() => {
    getTokenCalls = 0;
    mockPush.mockClear();
    resetClientTokenCache();

    routerSpy = jest.spyOn(nextNavigation, "useRouter").mockReturnValue({
      push: mockPush,
      replace: jest.fn(),
      prefetch: jest.fn(),
      back: jest.fn(),
      forward: jest.fn(),
      refresh: jest.fn(),
    });

    getTokenSpy = jest
      .spyOn(getTokenModule, "getToken")
      .mockImplementation(async () => {
        getTokenCalls++;
        await new Promise((r) => setTimeout(r, 10));
        return "mock-jwt-token-xyz";
      });

    removeTokenSpy = jest
      .spyOn(removeTokenModule, "removeTokenServer")
      .mockImplementation(async () => {});

    api.defaults.adapter = async (
      config: InternalAxiosRequestConfig,
    ): Promise<AxiosResponse> => {
      if (config.url?.includes("/unauthorized-test")) {
        const headers = new AxiosHeaders();
        const err = new AxiosError(
          "Request failed with status code 401",
          "ERR_BAD_REQUEST",
          config,
          null,
          {
            status: 401,
            statusText: "Unauthorized",
            headers,
            config,
            data: { error: "Unauthorized" },
          },
        );
        return Promise.reject(err);
      }

      return {
        data: { ok: true },
        status: 200,
        statusText: "OK",
        headers: {},
        config,
      };
    };
  });

  afterEach(() => {
    getTokenSpy.mockRestore();
    removeTokenSpy.mockRestore();
    routerSpy.mockRestore();
    api.defaults.adapter = originalAdapter;
    resetClientTokenCache();
  });

  test("1. Firing 5 concurrent API requests on initial load invokes getToken exactly 1 time, and subsequent requests invoke it 0 times", async () => {
    const responses = await Promise.all([
      api.get("/api/events/1"),
      api.get("/api/events/2"),
      api.get("/api/events/3"),
      api.get("/api/events/4"),
      api.get("/api/events/5"),
    ]);

    expect(getTokenCalls).toBe(1);

    for (const res of responses) {
      expect(res.config.headers.Authorization).toBe("Bearer mock-jwt-token-xyz");
    }

    // Subsequent requests must use in-memory cached token with 0 additional getToken calls
    const res6 = await api.get("/api/events/6");
    const res7 = await api.get("/api/events/7");

    expect(getTokenCalls).toBe(1);
    expect(res6.config.headers.Authorization).toBe("Bearer mock-jwt-token-xyz");
    expect(res7.config.headers.Authorization).toBe("Bearer mock-jwt-token-xyz");
  });

  test("2. Calling clearClientToken() nulls the cached token and deletes the default Authorization header", async () => {
    setClientToken("active-token");
    expect(api.defaults.headers.common["Authorization"]).toBe(
      "Bearer active-token",
    );

    clearClientToken();

    expect(api.defaults.headers.common["Authorization"]).toBeUndefined();
    const token = await getClientToken();
    expect(token).toBeNull();
  });

  test("3. A 401 response triggers clearClientToken() and removes Authorization header", async () => {
    setClientToken("expired-token");
    expect(api.defaults.headers.common["Authorization"]).toBe(
      "Bearer expired-token",
    );

    let caughtError = false;
    try {
      await api.get("/unauthorized-test");
    } catch {
      caughtError = true;
    }

    expect(caughtError).toBe(true);
    expect(api.defaults.headers.common["Authorization"]).toBeUndefined();
    const tokenAfter401 = await getClientToken();
    expect(tokenAfter401).toBeNull();
  });

  test("4. Calling setClientToken('new-jwt') immediately sets Authorization: Bearer new-jwt without calling getToken()", async () => {
    getTokenCalls = 0;
    setClientToken("new-jwt-999");

    expect(api.defaults.headers.common["Authorization"]).toBe(
      "Bearer new-jwt-999",
    );

    const token = await getClientToken();
    expect(token).toBe("new-jwt-999");
    expect(getTokenCalls).toBe(0);

    const res = await api.get("/api/events/fresh");
    expect(res.config.headers.Authorization).toBe("Bearer new-jwt-999");
    expect(getTokenCalls).toBe(0);
  });

  test("5. useToken hook integrates with in-memory token cache", async () => {
    setClientToken("session-token-555");

    const { result } = renderHook(() => useToken());
    const token = await result.current.getAuthToken();
    expect(token).toBe("session-token-555");
    expect(getTokenCalls).toBe(0);

    await act(async () => {
      await result.current.logout();
    });

    expect(api.defaults.headers.common["Authorization"]).toBeUndefined();
    const clearedToken = await getClientToken();
    expect(clearedToken).toBeNull();
    expect(mockPush).toHaveBeenCalledWith("/signin");
  });
});
