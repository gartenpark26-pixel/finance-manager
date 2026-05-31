import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const CATEGORIES = [
  { name: "식비", icon: "🍽️", color: "#ef4444" },
  { name: "카페", icon: "☕", color: "#a855f7" },
  { name: "교통", icon: "🚇", color: "#0ea5e9" },
  { name: "쇼핑", icon: "🛍️", color: "#ec4899" },
  { name: "의료", icon: "🏥", color: "#22c55e" },
  { name: "교육", icon: "📚", color: "#f59e0b" },
  { name: "문화/여가", icon: "🎬", color: "#8b5cf6" },
  { name: "통신", icon: "📱", color: "#06b6d4" },
  { name: "공과금", icon: "🏠", color: "#10b981" },
  { name: "기타", icon: "📦", color: "#6b7280" },
];

const PORTFOLIOS = [
  { name: "아빠", color: "#3b82f6" },
  { name: "엄마", color: "#ec4899" },
  { name: "공동", color: "#10b981" },
];

async function main() {
  for (const c of CATEGORIES) {
    await prisma.category.upsert({
      where: { name: c.name },
      update: { icon: c.icon, color: c.color },
      create: c,
    });
  }

  const existing = await prisma.portfolio.count();
  if (existing === 0) {
    for (const p of PORTFOLIOS) {
      await prisma.portfolio.create({ data: p });
    }
  }

  console.log("Seed complete");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
