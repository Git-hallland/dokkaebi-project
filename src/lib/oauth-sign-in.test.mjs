import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

import { betterAuth } from "better-auth";

const productionOrigin = "https://dokkaebi.wiki";

function createUnavailableDatabase(calls) {
  const adapter = new Proxy(
    {
      id: "unavailable-test-adapter",
      transaction: async (callback) => callback(adapter),
    },
    {
      get(target, property) {
        if (property === "then") return undefined;
        if (property in target) return target[property];

        return async () => {
          calls.push(String(property));
          throw Object.assign(new Error("database unavailable"), { code: "P1001" });
        };
      },
    },
  );

  return () => adapter;
}

function createTestAuth(databaseCalls) {
  return betterAuth({
    baseURL: productionOrigin,
    secret: "test-only-high-entropy-secret-0123456789-abcdefghijklmnopqrstuvwxyz",
    database: createUnavailableDatabase(databaseCalls),
    account: {
      storeStateStrategy: "cookie",
    },
    socialProviders: {
      google: {
        clientId: "google-test-client",
        clientSecret: "google-test-secret",
      },
      kakao: {
        clientId: "kakao-test-client",
        clientSecret: "kakao-test-secret",
      },
    },
  });
}

for (const [provider, authorizeHost] of [
  ["google", "accounts.google.com"],
  ["kakao", "kauth.kakao.com"],
]) {
  test(`${provider} OAuth authorization starts without a database connection`, async () => {
    const databaseCalls = [];
    const auth = createTestAuth(databaseCalls);
    const request = new Request(`${productionOrigin}/api/auth/sign-in/social`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        origin: productionOrigin,
      },
      body: JSON.stringify({
        provider,
        callbackURL: "/profile",
        errorCallbackURL: "/profile?authError=oauth",
      }),
    });

    const response = await auth.handler(request);
    const body = await response.json();
    const authorizeUrl = new URL(body.url);

    assert.equal(response.status, 200);
    assert.equal(authorizeUrl.hostname, authorizeHost);
    assert.equal(
      authorizeUrl.searchParams.get("redirect_uri"),
      `${productionOrigin}/api/auth/callback/${provider}`,
    );
    assert.match(response.headers.get("set-cookie") ?? "", /oauth_state/u);
    assert.deepEqual(databaseCalls, []);
  });
}

test("the production auth configuration uses encrypted cookie-backed OAuth state", async () => {
  const source = await readFile(new URL("./auth.ts", import.meta.url), "utf8");

  assert.match(source, /account:\s*\{[\s\S]*storeStateStrategy:\s*"cookie"/u);
  assert.doesNotMatch(source, /skipStateCookieCheck:\s*true/u);
});
