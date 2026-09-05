import { PrismaClient, UserRole, UserStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { randomUUID } from 'crypto';

const prisma = new PrismaClient();

const subjects = [
  { nameEn: 'Mathematics', nameHi: 'गणित' },
  { nameEn: 'Physics', nameHi: 'भौतिक विज्ञान' },
  { nameEn: 'Chemistry', nameHi: 'रसायन विज्ञान' },
  { nameEn: 'Biology', nameHi: 'जीव विज्ञान' },
  { nameEn: 'Science', nameHi: 'विज्ञान' },
  { nameEn: 'English', nameHi: 'अंग्रेज़ी' },
  { nameEn: 'Hindi', nameHi: 'हिन्दी' },
  { nameEn: 'Sanskrit', nameHi: 'संस्कृत' },
  { nameEn: 'Social Science', nameHi: 'सामाजिक विज्ञान' },
  { nameEn: 'History', nameHi: 'इतिहास' },
  { nameEn: 'Geography', nameHi: 'भूगोल' },
  { nameEn: 'Political Science', nameHi: 'राजनीति विज्ञान' },
  { nameEn: 'Economics', nameHi: 'अर्थशास्त्र' },
  { nameEn: 'Accountancy', nameHi: 'लेखाशास्त्र' },
  { nameEn: 'Business Studies', nameHi: 'व्यवसाय अध्ययन' },
  { nameEn: 'Computer Science', nameHi: 'कंप्यूटर विज्ञान' },
  { nameEn: 'Information Technology', nameHi: 'सूचना प्रौद्योगिकी' },
  { nameEn: 'EVS', nameHi: 'पर्यावरण अध्ययन' },
  { nameEn: 'Reasoning / Aptitude', nameHi: 'रीज़निंग / एप्टीट्यूड' },
  { nameEn: 'Spoken English', nameHi: 'Spoken English' },
  { nameEn: 'French', nameHi: 'फ्रेंच' },
  { nameEn: 'Other', nameHi: 'अन्य' },
];

const classes = [
  { nameEn: 'Nursery / KG', nameHi: 'नर्सरी / केजी', sortOrder: 0 },
  { nameEn: 'Class 1', nameHi: 'कक्षा 1', sortOrder: 1 },
  { nameEn: 'Class 2', nameHi: 'कक्षा 2', sortOrder: 2 },
  { nameEn: 'Class 3', nameHi: 'कक्षा 3', sortOrder: 3 },
  { nameEn: 'Class 4', nameHi: 'कक्षा 4', sortOrder: 4 },
  { nameEn: 'Class 5', nameHi: 'कक्षा 5', sortOrder: 5 },
  { nameEn: 'Class 6', nameHi: 'कक्षा 6', sortOrder: 6 },
  { nameEn: 'Class 7', nameHi: 'कक्षा 7', sortOrder: 7 },
  { nameEn: 'Class 8', nameHi: 'कक्षा 8', sortOrder: 8 },
  { nameEn: 'Class 9', nameHi: 'कक्षा 9', sortOrder: 9 },
  { nameEn: 'Class 10', nameHi: 'कक्षा 10', sortOrder: 10 },
  { nameEn: 'Class 11', nameHi: 'कक्षा 11', sortOrder: 11 },
  { nameEn: 'Class 12', nameHi: 'कक्षा 12', sortOrder: 12 },
  { nameEn: 'Undergraduate', nameHi: 'स्नातक', sortOrder: 15 },
  { nameEn: 'Competitive Exams', nameHi: 'प्रतियोगी परीक्षा', sortOrder: 20 },
  { nameEn: 'Other', nameHi: 'अन्य', sortOrder: 99 },
];

const boards = [
  { nameEn: 'CBSE', nameHi: 'सीबीएसई' },
  { nameEn: 'ICSE', nameHi: 'आईसीएसई' },
  { nameEn: 'State Board', nameHi: 'राज्य बोर्ड' },
  { nameEn: 'IB', nameHi: 'आईबी' },
  { nameEn: 'Cambridge', nameHi: 'कैम्ब्रिज' },
  { nameEn: 'NIOS', nameHi: 'एनआईओएस' },
  { nameEn: 'Other', nameHi: 'अन्य' },
];

async function main() {
  const isProd = process.env.NODE_ENV === 'production';
  const email = process.env.ADMIN_EMAIL ?? 'admintutorconnect@yopmail.com';
  const password = process.env.ADMIN_PASSWORD ?? 'Admin@123456';
  const mobile = process.env.ADMIN_MOBILE ?? '9999999999';

  if (isProd) {
    if (!process.env.ADMIN_PASSWORD?.trim() || password === 'Admin@123456') {
      throw new Error(
        'ADMIN_PASSWORD must be set to a strong unique value when NODE_ENV=production (not Admin@123456)',
      );
    }
  }

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
