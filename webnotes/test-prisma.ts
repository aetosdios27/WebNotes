// test-prisma.ts
import { PrismaNeon } from "@prisma/adapter-neon";
import { PrismaClient } from "@prisma/client";

const adapter = new PrismaNeon({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

const u = await prisma.user.findFirst();
console.log("✅ Works:", u);
await prisma.$disconnect();
