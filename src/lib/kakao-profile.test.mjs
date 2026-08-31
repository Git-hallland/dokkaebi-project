import assert from "node:assert/strict";
import test from "node:test";

import { getKakaoUserEmail } from "./kakao-profile.ts";

test("uses a trimmed Kakao email when one is provided", () => {
  assert.equal(
    getKakaoUserEmail({
      id: 101,
      kakao_account: { email: "  user@example.com  " },
    }),
    "user@example.com",
  );
});

test("uses a deterministic placeholder when the email is undefined", () => {
  const profile = { id: 202, kakao_account: {} };

  assert.equal(
    getKakaoUserEmail(profile),
    "202@kakao.placeholder.invalid",
  );
  assert.equal(getKakaoUserEmail(profile), getKakaoUserEmail(profile));
});

test("uses a placeholder when the email is empty or whitespace", () => {
  assert.equal(
    getKakaoUserEmail({ id: 303, kakao_account: { email: "   " } }),
    "303@kakao.placeholder.invalid",
  );
});

test("creates different placeholders for different Kakao user IDs", () => {
  assert.notEqual(
    getKakaoUserEmail({ id: 404, kakao_account: {} }),
    getKakaoUserEmail({ id: 405, kakao_account: {} }),
  );
});
