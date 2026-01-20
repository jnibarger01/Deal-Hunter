import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  // Create test user
  const hashedPassword = await bcrypt.hash('Test123!', 10);

  const user = await prisma.user.upsert({
    where: { email: 'test@dealhunter.com' },
    update: {},
    create: {
      email: 'test@dealhunter.com',
      password: hashedPassword,
      firstName: 'Test',
      lastName: 'User',
      emailVerified: true,
      role: 'user',
    },
  });

  console.log('✅ Created test user:', user.email);

  // Create admin user
  const adminPassword = await bcrypt.hash('Admin123!', 10);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@dealhunter.com' },
    update: {},
    create: {
      email: 'admin@dealhunter.com',
      password: adminPassword,
      firstName: 'Admin',
      lastName: 'User',
      emailVerified: true,
      role: 'admin',
    },
  });

  console.log('✅ Created admin user:', admin.email);

  // Create sample deals
  const sampleDeals = [
    {
      title: 'iPhone 13 Pro - Cracked Screen',
      description: 'Works perfectly but has a cracked screen. Easy fix!',
      price: 350,
      marketValue: 650,
      estimatedProfit: 200,
      dealScore: 85,
      roi: 57.14,
      category: 'tech',
      condition: 'good',
      imageUrl: 'https://images.unsplash.com/photo-1632661674596-df8be070a5c5',
      itemUrl: 'https://craigslist.org/example1',
      location: 'San Francisco, CA',
      marketplace: 'craigslist',
      repairDifficulty: 'easy',
      likelyIssues: 'Screen replacement needed - $100 part + 30 min labor',
      partsEstimate: 100,
      status: 'active',
    },
    {
      title: 'Sony 65" OLED TV - No Power',
      description: 'TV won\'t turn on. Possible power supply issue.',
      price: 200,
      marketValue: 1200,
      estimatedProfit: 800,
      dealScore: 92,
      roi: 400,
      category: 'tv',
      condition: 'fair',
      imageUrl: 'https://images.unsplash.com/photo-1593359677879-a4bb92f829d1',
      itemUrl: 'https://facebook.com/marketplace/example2',
      location: 'Oakland, CA',
      marketplace: 'facebook',
      repairDifficulty: 'moderate',
      likelyIssues: 'Power supply board failure - common issue with this model',
      partsEstimate: 150,
      status: 'active',
    },
    {
      title: 'MacBook Pro 2019 - Water Damage',
      description: 'Spilled coffee on it. Worked fine before.',
      price: 400,
      marketValue: 1100,
      estimatedProfit: 500,
      dealScore: 78,
      roi: 125,
      category: 'tech',
      condition: 'poor',
      imageUrl: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8',
      itemUrl: 'https://ebay.com/example3',
      location: 'San Jose, CA',
      marketplace: 'ebay',
      repairDifficulty: 'hard',
      likelyIssues: 'Liquid damage requires board-level repair',
      partsEstimate: 200,
      status: 'active',
    },
  ];

  for (const deal of sampleDeals) {
    await prisma.deal.create({
      data: deal,
    });
  }

  console.log(`✅ Created ${sampleDeals.length} sample deals`);

  // Create marketplace sync records
  const marketplaces = ['craigslist', 'ebay', 'facebook'];
  for (const marketplace of marketplaces) {
    await prisma.marketplaceSync.upsert({
      where: { marketplace },
      update: {},
      create: {
        marketplace,
        lastSyncAt: new Date(),
        itemsSynced: 0,
        status: 'success',
      },
    });
  }

  console.log('✅ Created marketplace sync records');

  console.log('🎉 Seed completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
