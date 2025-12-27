import { CreateUserDto } from 'src/users/dto/create-user.dto';
import { PrismaClient, Prisma } from './generated/client';

import { PrismaPg } from '@prisma/adapter-pg';

const dotenv = require('dotenv');
const env = process.env.NODE_ENV || 'development';
dotenv.config({ path: '.env.' + env });

const pool = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter: pool });

const userData:  CreateUserDto[] = [
  {
    name: 'Alice',
    email: 'alice@prisma.io',
  },
  {
    name: 'Nilu',
    email: 'nilu@prisma.io',
  },
  {
    name: 'Mahmoud',
    email: 'mahmoud@prisma.io',
  },
];

async function main() {
  console.log(`Start seeding ...`);

  await prisma.post.deleteMany();
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
    console.error("seeder error:",e);
    await prisma.$disconnect();
    process.exit(1);
  });