import { betterAuth } from "better-auth";
import { APIError } from "better-auth/api";
import { prismaAdapter } from "better-auth/adapters/prisma";

import { getKakaoUserEmail } from "@/lib/kakao-profile";
import { prisma } from "@/lib/prisma";
import {
  PROFILE_IMAGE_PROOF_HEADER,
  verifyProfileImageUpdateProof,
} from "@/lib/cloudinary-profile";
import { normalizeProfileName } from "@/lib/profile-input";
import { isFrontendOnly } from "@/lib/runtime-mode";

function requireServerEnv(name: string) {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(`${name} is not configured.`);
  }

  return value;
}

function createAuth() {
  return betterAuth({
  baseURL: requireServerEnv("BETTER_AUTH_URL"),
  secret: requireServerEnv("BETTER_AUTH_SECRET"),
  database: prismaAdapter(prisma, {
    provider: "postgresql",
    transaction: true,
  }),
  emailAndPassword: {
    enabled: false,
  },
  user: {
    additionalFields: {
      role: {
        type: ["USER", "EDITOR", "REVIEWER", "ADMIN"],
        required: true,
        defaultValue: "USER",
        input: false,
      },
    },
  },
  databaseHooks: {
    user: {
      update: {
        before: async (user, context) => {
          try {
            if (user.image !== undefined) {
              const sessionUserId = context?.context.session?.user.id;
              const proof = context?.headers?.get(PROFILE_IMAGE_PROOF_HEADER) ?? null;

              if (
                typeof user.image !== "string" ||
                !sessionUserId ||
                !verifyProfileImageUpdateProof(sessionUserId, user.image, proof)
              ) {
                throw new Error("검증된 프로필 이미지 업로드만 저장할 수 있습니다.");
              }
            }

            return {
              data: {
                ...user,
                ...(user.name !== undefined ? { name: normalizeProfileName(user.name) } : {}),
              },
            };
          } catch (error) {
            throw new APIError("BAD_REQUEST", {
              code: "INVALID_PROFILE_INPUT",
              message: error instanceof Error ? error.message : "프로필 입력값이 올바르지 않습니다.",
            });
          }
        },
      },
    },
  },
  account: {
    encryptOAuthTokens: true,
    accountLinking: {
      disableImplicitLinking: true,
    },
  },
  socialProviders: {
    google: {
      clientId: requireServerEnv("GOOGLE_CLIENT_ID"),
      clientSecret: requireServerEnv("GOOGLE_CLIENT_SECRET"),
    },
    kakao: {
      clientId: requireServerEnv("KAKAO_CLIENT_ID"),
      clientSecret: requireServerEnv("KAKAO_CLIENT_SECRET"),
      disableDefaultScope: true,
      scope: ["profile_nickname", "profile_image"],
      mapProfileToUser: (profile) => ({
        email: getKakaoUserEmail(profile),
      }),
    },
  },
  });
}

type Auth = ReturnType<typeof createAuth>;

let authInstance: Auth | undefined;

export function getAuth() {
  if (isFrontendOnly()) {
    throw new Error("Authentication is unavailable in frontend-only preview mode.");
  }
  authInstance ??= createAuth();
  return authInstance;
}

export const auth = new Proxy({} as Auth, {
  get(_target, property) {
    const instance = getAuth();
    const value = Reflect.get(instance, property, instance) as unknown;
    return typeof value === "function" ? value.bind(instance) : value;
  },
});
