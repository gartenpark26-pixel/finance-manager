import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "./prisma";

async function getCurrentPasswordHash(): Promise<string | null> {
  const row = await prisma.appConfig.findUnique({ where: { key: "password_hash" } });
  return row?.value ?? null;
}

async function passwordMatches(input: string): Promise<boolean> {
  const stored = await getCurrentPasswordHash();
  if (stored) return bcrypt.compare(input, stored);
  const envPw = process.env.APP_PASSWORD;
  if (!envPw) return false;
  return input === envPw;
}

export const authOptions: NextAuthOptions = {
  session: {
    strategy: "jwt",
    maxAge: 60 * 60 * 24 * 30,
  },
  providers: [
    CredentialsProvider({
      name: "Password",
      credentials: {
        password: { label: "비밀번호", type: "password" },
      },
      async authorize(credentials) {
        const pw = credentials?.password ?? "";
        if (!pw) return null;
        const ok = await passwordMatches(pw);
        if (!ok) return null;
        return { id: "owner", name: "Owner" };
      },
    }),
  ],
  pages: {
    signIn: "/login",
  },
};

export async function setPassword(plain: string) {
  const hash = await bcrypt.hash(plain, 10);
  await prisma.appConfig.upsert({
    where: { key: "password_hash" },
    update: { value: hash },
    create: { key: "password_hash", value: hash },
  });
}

export async function verifyPassword(plain: string) {
  return passwordMatches(plain);
}
