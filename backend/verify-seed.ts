import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function verify() {
    console.log('🔍 Verifying database seed...\n');

    // Check users
    const userCount = await prisma.users.count();
    const admin = await prisma.users.findFirst({
        where: { email: 'admin@rachelfoods.com' }
    });
    console.log(`👤 Users: ${userCount}`);
    console.log(`   Admin exists: ${admin ? '✅' : '❌'} ${admin?.email || ''}`);

    // Check categories
    const categoryCount = await prisma.categories.count();
    const categories = await prisma.categories.findMany({ take: 5 });
    console.log(`\n📁 Categories: ${categoryCount}`);
    categories.forEach(cat => console.log(`   • ${cat.name}`));

    // Check products
    const productCount = await prisma.products.count();
    const products = await prisma.products.findMany({
        take: 5,
        include: { category: true }
    });
    console.log(`\n🍲 Products: ${productCount}`);
    products.forEach(p => console.log(`   • ${p.name} (${p.category?.name || 'No category'}) - ${p.stock} in stock - ${p.images && p.images.length > 0 ? 'Has image' : 'No image'}`));

    // Check hero slides
    const heroCount = await prisma.hero_slides.count();
    const slides = await prisma.hero_slides.findMany({
        orderBy: { order: 'asc' }
    });
    console.log(`\n🎨 Hero Slides: ${heroCount}`);
    slides.forEach(s => console.log(`   • ${s.title} - ${s.imageUrl}`));

    // Check product_images table exists
    try {
        const imageCount = await prisma.product_images.count();
        console.log(`\n🖼️  Product Images table: ✅ (${imageCount} images)`);
    } catch (e) {
        console.log(`\n🖼️  Product Images table: ❌ Not created yet`);
    }

    // Check product_videos table exists
    try {
        const videoCount = await prisma.product_videos.count();
        console.log(`📹 Product Videos table: ✅ (${videoCount} videos)`);
    } catch (e) {
        console.log(`📹 Product Videos table: ❌ Not created yet`);
    }

    console.log('\n✅ Verification complete!');
}

verify()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
