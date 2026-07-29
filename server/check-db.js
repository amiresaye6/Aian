const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const orgs = await prisma.organization.findMany();
  console.log(orgs.map(o => ({name: o.name, logoUrl: o.logoUrl})));
  const users = await prisma.user.findMany();
  console.log(users.map(u => ({name: u.fullName, avatarUrl: u.avatarUrl})));
}
main().finally(() => prisma.$disconnect());
