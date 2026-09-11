import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

import {
  SupporterInputError,
  isUniqueSupporterError,
  normalizeMemberSearch,
  normalizeSupporterCreateInput,
  normalizeSupporterUpdateInput,
  providerNames,
} from "./supporters.ts";

test("validates supporter member searches and mutations", () => {
  assert.equal(normalizeMemberSearch("  Hallland  "), "Hallland");
  assert.deepEqual(normalizeSupporterCreateInput({ userId: " user-1 " }), { userId: "user-1" });
  assert.deepEqual(normalizeSupporterUpdateInput({ displayOrder: 3, isVisible: false }), { displayOrder: 3, isVisible: false });
  assert.throws(() => normalizeSupporterCreateInput({ userId: "", name: "직접 입력" }), SupporterInputError);
  assert.throws(() => normalizeSupporterUpdateInput({ displayOrder: -1 }), SupporterInputError);
});

test("maps providers without exposing account details and detects unique races", () => {
  assert.deepEqual(providerNames([{ providerId: "google" }, { providerId: "kakao" }, { providerId: "google" }]), ["Google", "Kakao"]);
  assert.equal(isUniqueSupporterError({ code: "P2002" }), true);
  assert.equal(isUniqueSupporterError({ code: "P2003" }), false);
});

test("supporter migration and public query are additive and privacy-minimal", async () => {
  const [migration, data, homeCards, modal] = await Promise.all([
    readFile(new URL("../../prisma/migrations/20260911010000_add_supporters_and_report_reason/migration.sql", import.meta.url), "utf8"),
    readFile(new URL("./supporter-data.ts", import.meta.url), "utf8"),
    readFile(new URL("../components/HomeCommunityCards.tsx", import.meta.url), "utf8"),
    readFile(new URL("../components/SupporterRanking.tsx", import.meta.url), "utf8"),
  ]);
  assert.doesNotMatch(migration, /\b(?:DROP|TRUNCATE)\b|^\s*DELETE\s+FROM\b|ALTER\s+TABLE[\s\S]*?\bDROP\b/imu);
  assert.match(migration, /UNIQUE INDEX "Supporter_userId_key"/u);
  assert.match(data, /revalidate: 300/u);
  assert.match(data, /name: true/u);
  assert.match(data, /image: true/u);
  assert.doesNotMatch(data, /email: true|providerId: true|role: true/u);
  assert.match(homeCards, /<SupporterRanking supporters=\{supporters\}/u);
  assert.match(modal, /showModal\(\)/u);
  assert.match(modal, /event\.target === event\.currentTarget/u);
});
