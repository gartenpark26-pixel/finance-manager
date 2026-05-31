import { prisma } from "@/lib/prisma";
import { ExpensesClient } from "./ExpensesClient";

export const dynamic = "force-dynamic";

export default async function ExpensesPage() {
  const categories = await prisma.category.findMany({ orderBy: { name: "asc" } });
  return <ExpensesClient categories={categories} />;
}
