import React from "react";
import { expect, afterEach, mock } from "bun:test";
import * as matchers from "@testing-library/jest-dom/matchers";
import type { TestingLibraryMatchers } from "@testing-library/jest-dom/matchers";
import { cleanup } from "@testing-library/react";

declare module "bun:test" {
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  interface Matchers
    extends TestingLibraryMatchers<unknown, void> {}
}

expect.extend(matchers);

export interface TestRouterState {
  params: Record<string, string>;
  search: Record<string, unknown>;
  loaderData: Record<string, unknown>;
  navigate: ReturnType<typeof mock>;
  pathname: string;
}

export const testRouterState: TestRouterState = {
  params: { eventId: "evt-test-101", ticketId: "ticket-active-1" },
  search: {},
  loaderData: {},
  navigate: mock(),
  pathname: "/",
};

// Global unified mock for @tanstack/react-router
mock.module("@tanstack/react-router", () => ({
  createFileRoute: (path: string) => (opts: Record<string, unknown>) => {
    return {
      ...opts,
      path,
      useParams: () => testRouterState.params,
      useSearch: () => testRouterState.search,
      useLoaderData: () => testRouterState.loaderData,
    };
  },
  useParams: () => testRouterState.params,
  useSearch: () => testRouterState.search,
  useLoaderData: () => testRouterState.loaderData,
  useNavigate: () => testRouterState.navigate,
  useLocation: (opts?: {
    select?: (loc: {
      pathname: string;
      search: Record<string, unknown>;
      hash: string;
    }) => unknown;
  }) => {
    const loc = {
      pathname: testRouterState.pathname,
      search: testRouterState.search,
      hash: "",
    };
    return opts?.select ? opts.select(loc) : loc;
  },
  useRouter: () => ({
    history: { back: mock() },
    invalidate: mock(),
    navigate: testRouterState.navigate,
    isServer: false,
  }),
  getRouteApi: () => ({
    useParams: () => testRouterState.params,
    useSearch: () => testRouterState.search,
    useLoaderData: () => testRouterState.loaderData,
  }),
  Outlet: ({ children }: { children?: React.ReactNode }) =>
    React.createElement("div", { "data-testid": "outlet" }, children),
  Link: ({
    children,
    to,
    params,
    search,
    ...props
  }: {
    children?: React.ReactNode;
    to?: string;
    params?: Record<string, string>;
    search?: Record<string, string>;
    [k: string]: unknown;
  }) => {
    let href = to || "";
    if (params) {
      for (const [k, v] of Object.entries(params)) {
        href = href.replace(`$${k}`, v);
      }
    }
    if (search && Object.keys(search).length > 0) {
      const qs = new URLSearchParams(search).toString();
      href = `${href}?${qs}`;
    }
    return React.createElement("a", { href, ...props }, children);
  },
  notFound: () => {
    throw new Error("NOT_FOUND");
  },
  redirect: (opts: unknown) => ({ isRedirect: true, ...((opts as object) || {}) }),
  isRedirect: (obj: unknown) =>
    Boolean(obj && typeof obj === "object" && "isRedirect" in obj),
  createRouter: () => ({
    load: mock(),
    history: { back: mock() },
    navigate: testRouterState.navigate,
  }),
  createRootRoute: (opts: unknown) => opts,
  HeadContent: () => null,
  Scripts: () => null,
  RouterProvider: ({ children }: { children?: React.ReactNode }) =>
    React.createElement(React.Fragment, null, children),
  CatchBoundary: ({ children }: { children?: React.ReactNode }) =>
    React.createElement(React.Fragment, null, children),
  useMatch: () => ({}),
  useMatches: () => [],
}));

afterEach(() => {
  cleanup();
});
