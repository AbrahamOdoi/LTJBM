import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  LOGIN_LOCKOUT_MS,
  LOGIN_MAX_FAILURES,
  LOGIN_WINDOW_MS,
} from "@/lib/auth/rate-limit";

describe("login rate limit constants", () => {
  it("uses a sensible failure threshold and window", () => {
    assert.ok(LOGIN_MAX_FAILURES >= 5);
    assert.ok(LOGIN_MAX_FAILURES <= 20);
    assert.equal(LOGIN_WINDOW_MS, 15 * 60 * 1000);
    assert.equal(LOGIN_LOCKOUT_MS, 15 * 60 * 1000);
  });
});
