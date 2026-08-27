import { PrismaClient, UserRole, UserStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { randomUUID } from 'crypto';

const prisma = new PrismaClient();

const subjects = [
  { nameEn: 'Mathematics', nameHi: 'गणित' },
  { nameEn: 'Physics', nameHi: 'भौतिक विज्ञान' },
  { nameEn: 'Chemistry', nameHi: 'रसायन विज्ञान' },
  { nameEn: 'Biology', nameHi: 'जीव विज्ञान' },
  { nameEn: 'English', nameHi: 'अंग्रेज़ी' },
  { nameEn: 'Hindi', nameHi: 'हिन्दी' },
  { nameEn: 'Social Science', nameHi: 'सामाजिक विज्ञान' },
  { nameEn: 'Computer Science', nameHi: 'कंप्यूटर विज्ञान' },
];

const classes = [
  { nameEn: 'Class 6', nameHi: 'कक्षा 6', sortOrder: 6 },
  { nameEn: 'Class 7', nameHi: 'कक्षा 7', sortOrder: 7 },
  { nameEn: 'Class 8', nameHi: 'कक्षा 8', sortOrder: 8 },
  { nameEn: 'Class 9', nameHi: 'कक्षा 9', sortOrder: 9 },
  { nameEn: 'Class 10', nameHi: 'कक्षा 10', sortOrder: 10 },
  { nameEn: 'Class 11', nameHi: 'कक्षा 11', sortOrder: 11 },
  { nameEn: 'Class 12', nameHi: 'कक्षा 12', sortOrder: 12 },
  { nameEn: 'Competitive Exams', nameHi: 'प्रतियोगी परीक्षा', sortOrder: 20 },
];

const boards = [
  { nameEn: 'CBSE', nameHi: 'सीबीएसई' },
  { nameEn: 'ICSE', nameHi: 'आईसीएसई' },
  { nameEn: 'State Board', nameHi: 'राज्य बोर्ड' },
  { nameEn: 'IB', nameHi: 'आईबी' },
];

async function main() {
  const email = process.env.ADMIN_EMAIL ?? 'admin@tutorconnect.in';
  const password = process.env.ADMIN_PASSWORD ?? 'Admin@123456';
  const mobile = process.env.ADMIN_MOBILE ?? '9999999999';
  const passwordHash = await bcrypt.hash(password, 12);

  await prisma.user.upsert({
    where: { email },
    update: {},
    create: {
      email,
      mobile,
      name: 'Platform Admin',
      role: UserRole.ADMIN,
      status: UserStatus.ACTIVE,
      passwordHash,
      locale: 'en',
    },
  });
  console.log(`Admin user seeded: ${email}`);

  for (const s of subjects) {
    await prisma.subject.upsert({
      where: { nameEn: s.nameEn },
      update: { nameHi: s.nameHi },
      create: { id: randomUUID(), ...s },
    });
  }
  for (const c of classes) {
    await prisma.classLevel.upsert({
      where: { nameEn: c.nameEn },
      update: { nameHi: c.nameHi, sortOrder: c.sortOrder },
      create: { id: randomUUID(), ...c },
    });
  }
  for (const b of boards) {
    await prisma.board.upsert({
      where: { nameEn: b.nameEn },
      update: { nameHi: b.nameHi },
      create: { id: randomUUID(), ...b },
    });
  }
  console.log('Subjects, classes, boards seeded');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
