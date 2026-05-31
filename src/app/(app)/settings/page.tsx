import { prisma } from "@/lib/prisma";
import { SettingsClient } from "./SettingsClient";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const [categories, portfolios] = await Promise.all([
    prisma.category.findMany({ orderBy: { name: "asc" } }),
    prisma.portfolio.findMany({ orderBy: { createdAt: "asc" } }),
  ]);
  return <SettingsClient categories={categories} portfolios={portfolios} />;
}
