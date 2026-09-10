import type { PrismaClient } from "@/generated/prisma/client";

import { validateNickname } from "@/lib/profile-input";

type NicknamePrisma = Pick<PrismaClient, "user">;

export class NicknameConflictError extends Error {
  readonly code = "NICKNAME_TAKEN";

  constructor() {
    super("이미 사용 중인 닉네임입니다.");
    this.name = "NicknameConflictError";
  }
}

function isUniqueConstraintError(error: unknown) {
  return Boolean(error && typeof error === "object" && "code" in error && error.code === "P2002");
}

export async function isNicknameAvailable(
  database: NicknamePrisma,
  value: unknown,
  currentUser: Readonly<{ id: string; role: string }>,
) {
  const nickname = validateNickname(value, { allowStaffTerms: currentUser.role === "ADMIN" });
  const existing = await database.user.findFirst({
    select: { id: true },
    where: {
      NOT: { id: currentUser.id },
      OR: [
        { nicknameKey: nickname.key },
        { name: { equals: nickname.name, mode: "insensitive" } },
      ],
    },
  });

  return { ...nickname, available: existing === null };
}

export async function updateNickname(
  database: NicknamePrisma,
  value: unknown,
  currentUser: Readonly<{ id: string; role: string }>,
) {
  const result = await isNicknameAvailable(database, value, currentUser);

  if (!result.available) {
    throw new NicknameConflictError();
  }

  try {
    return await database.user.update({
      data: { name: result.name, nicknameKey: result.key },
      select: { name: true },
      where: { id: currentUser.id },
    });
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      throw new NicknameConflictError();
    }
    throw error;
  }
}
