import { PrismaClient, Prisma } from './generated/client';

import { PrismaPg } from '@prisma/adapter-pg';

const dotenv = require('dotenv');
const env = process.env.NODE_ENV || 'development';
dotenv.config({ path: '.env.' + env });

const pool = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter: pool });

const userData: Prisma.UserCreateInput[] = [
  {
    name: 'Alice',
    email: 'alice@prisma.io',
    age: 25,
    sex: 'F',
    status: 'ACTIVE',
  },
  {
    name: 'Nilu',
    email: 'nilu@prisma.io',
    age: 30,
    sex: 'M',
    status: 'ACTIVE',
  },
  {
    name: 'Mahmoud',
    email: 'mahmoud@prisma.io',
    age: 28,
    sex: 'M',
    status: 'ACTIVE',
  },
];

async function main() {
  console.log(`Start seeding ...`);

  await prisma.user.deleteMany();

  for (const u of userData) {
    const user = await prisma.user.create({
      data: u,
    });
    console.log(`Created user with id: ${user.id}`);
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error('seeder error:', e);
    await prisma.$disconnect();
    process.exit(1);
  });
