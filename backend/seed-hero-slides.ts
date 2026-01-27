import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('🌱 Seeding hero slides...');

    // Get admin user for createdBy field
    const admin = await prisma.users.findFirst({
    });

    if (!admin) {
        console.error('❌ No admin user found. Please run seed-railway.ts first.');
        process.exit(1);
    }

    const slides = [
        {
            title: 'Fresh Traditional Foods',
            subtitle: 'Authentic Nigerian ingredients delivered to your door',
            imageUrl: '/images/hero-1.svg',
            linkUrl: '/catalog',
            buttonText: 'Shop Now',
            order: 0,
            isActive: true,
            createdBy: admin.id,
            updatedBy: admin.id,
        },
        {
            title: 'Premium Quality Ingredients',
            subtitle: 'Handpicked spices and ingredients from trusted sources',
            imageUrl: '/images/hero-2.svg',
            linkUrl: '/catalog',
            buttonText: 'Browse Collection',
            order: 1,
            isActive: true,
            createdBy: admin.id,
            updatedBy: admin.id,
        },
        {
            title: 'Fast & Reliable Delivery',
            subtitle: 'Get your favorite traditional foods delivered in 24-48 hours',
            imageUrl: '/images/hero-3.svg',
            linkUrl: '/catalog',
            buttonText: 'Order Now',
            order: 2,
            isActive: true,
            createdBy: admin.id,
            updatedBy: admin.id,
        },
    ];

    // Delete existing slides to avoid duplicates
    await prisma.hero_slides.deleteMany({});
    console.log('🗑️  Cleared existing slides');

    // Create new slides
    for (const slide of slides) {
        await prisma.hero_slides.create({
            data: slide,
        });
        console.log(`✅ Created slide: ${slide.title}`);
    }

    console.log('✨ Hero slides seeded successfully!');
}

main()
    .catch((e) => {
        console.error('❌ Error seeding hero slides:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
