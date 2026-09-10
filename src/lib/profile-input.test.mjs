import assert from "node:assert/strict";
import test from "node:test";

import { normalizeProfileName, validateNickname } from "./profile-input.ts";

test("normalizes and accepts 2 to 12 Korean, English, or numeric characters", () => {
  assert.equal(normalizeProfileName("정현123"), "정현123");
  assert.equal(validateNickname("ＡＢ12").name, "AB12");
  assert.equal(normalizeProfileName("가".repeat(12)), "가".repeat(12));
  assert.throws(() => normalizeProfileName("가"));
  assert.throws(() => normalizeProfileName("가".repeat(13)));
});

test("rejects whitespace, punctuation, emoji, controls, and zero-width characters", () => {
  for (const value of ["정 현", "정현!", "정현_", "@정현", "정현🔥", "정현\n", "정현\u200b"]) {
    assert.throws(() => normalizeProfileName(value));
  }
});

test("blocks clear staff impersonation including numeric affixes", () => {
  for (const value of ["운영자", "123운영진", "관리자12", "ADMIN", "administrator", "manager7"]) {
    assert.throws(() => validateNickname(value));
  }
  assert.equal(validateNickname("관리자", { allowStaffTerms: true }).name, "관리자");
  assert.equal(validateNickname("매니저김").name, "매니저김");
});

test("blocks curated abusive, sexual, and Ilbe-associated terms without fuzzy matching", () => {
  for (const value of ["씨발유저", "개새끼", "섹스", "일베", "일베충12", "노알라"]) {
    assert.throws(() => validateNickname(value));
  }
  assert.equal(validateNickname("일별기록").name, "일별기록");
});
