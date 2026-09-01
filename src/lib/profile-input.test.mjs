import assert from "node:assert/strict";
import test from "node:test";

import { normalizeProfileName } from "./profile-input.ts";

test("trims and accepts a valid profile name", () => {
  assert.equal(normalizeProfileName("  도깨비 편집자  "), "도깨비 편집자");
});

test("accepts 2 and 8 characters and rejects 1 and 9 characters", () => {
  assert.throws(() => normalizeProfileName("가"));
  assert.equal(normalizeProfileName("도깨"), "도깨");
  assert.equal(normalizeProfileName("가".repeat(8)), "가".repeat(8));
  assert.throws(() => normalizeProfileName("가".repeat(9)));
});

test("rejects whitespace, control-character, and HTML-like names", () => {
  assert.throws(() => normalizeProfileName(" "));
  assert.throws(() => normalizeProfileName("도깨비\n편집자"));
  assert.throws(() => normalizeProfileName("<b>닉네임</b>"));
});
