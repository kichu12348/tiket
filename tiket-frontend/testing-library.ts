import { expect, afterEach } from "bun:test";
import * as matchers from "@testing-library/jest-dom/matchers";
import type { TestingLibraryMatchers } from "@testing-library/jest-dom/matchers";
import { cleanup } from "@testing-library/react";

declare module "bun:test" {
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  interface Matchers
    extends TestingLibraryMatchers<unknown, void> {}
}

expect.extend(matchers);

afterEach(() => {
  cleanup();
});
