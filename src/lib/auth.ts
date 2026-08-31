import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";

import { getKakaoUserEmail } from "@/lib/kakao-profile";
import { prisma } from "@/lib/prisma";

function requireServerEnv(name: string) {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(`${name} is not configured.`);
  }

  return value;
}

export const auth = betterAuth({
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
      mapProfileToUser: (profile) => ({
        email: getKakaoUserEmail(profile),
      }),
    },
  },
});
