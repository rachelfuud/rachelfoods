import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { randomUUID } from 'crypto';

const prisma = new PrismaClient();

async function main() {
    console.log('🌱 Starting Railway database seed with correct products...\n');

    // 1. Create Admin User
    console.log('👤 Creating admin user...');
    const hashedPassword = await bcrypt.hash('Admin123!', 10);

    const admin = await prisma.users.upsert({
        where: { email: 'admin@rachelfoods.com' },
        update: {},
        create: {
            id: randomUUID(),
            email: 'admin@rachelfoods.com',
            password: hashedPassword,
            firstName: 'System',
            lastName: 'Administrator',
            role: 'ADMIN',
            updatedAt: new Date(),
        },
    });
    console.log(`✓ Admin created: ${admin.email}\n`);

    // 2. Create Categories
    console.log('📁 Creating categories...');

    const grainsStaples = await prisma.categories.upsert({
        where: { slug: 'grains-staples' },
        update: {},
        create: {
            id: randomUUID(),
            name: 'Grains & Staples',
            slug: 'grains-staples',
            description: 'Traditional staple foods and swallows',
            updatedAt: new Date(),
        },
    });
    console.log(`  ✓ ${grainsStaples.name}`);

    const proteinsFish = await prisma.categories.upsert({
        where: { slug: 'proteins-fish' },
        update: {},
        create: {
            id: randomUUID(),
            name: 'Proteins & Fish',
            slug: 'proteins-fish',
            description: 'Fresh and preserved protein sources',
            updatedAt: new Date(),
        },
    });
    console.log(`  ✓ ${proteinsFish.name}`);

    const spicesIngredients = await prisma.categories.upsert({
        where: { slug: 'spices-ingredients' },
        update: {},
        create: {
            id: randomUUID(),
            name: 'Spices & Ingredients',
            slug: 'spices-ingredients',
            description: 'Traditional seasonings and soup ingredients',
            updatedAt: new Date(),
        },
    });
    console.log(`  ✓ ${spicesIngredients.name}`);

    const readyMixes = await prisma.categories.upsert({
        where: { slug: 'ready-mixes' },
        update: {},
        create: {
            id: randomUUID(),
            name: 'Ready Mixes',
            slug: 'ready-mixes',
            description: 'Pre-mixed ingredients for quick cooking',
            updatedAt: new Date(),
        },
    });
    console.log(`  ✓ ${readyMixes.name}\n`);

    // 3. Create Products
    console.log('🍲 Creating products...');

    // Grains & Staples (3 products)
    await prisma.products.upsert({
        where: { slug: 'fresh-ogi' },
        update: {},
        create: {
            id: randomUUID(),
            name: 'Fresh Ogi',
            slug: 'fresh-ogi',
            description: 'Fermented cereal pudding (pap)',
            price: 700, // $7.00 in cents
            unit: 'Wrap/Pack',
            weight: 500,
            stock: 150,
            categoryId: grainsStaples.id,
            status: 'ACTIVE',
            isFeatured: false,
            updatedAt: new Date(),
        },
    });
    console.log('  ✓ Fresh Ogi');

    await prisma.products.upsert({
        where: { slug: 'fufu' },
        update: {},
        create: {
            id: randomUUID(),
            name: 'Fufu',
            slug: 'fufu',
            description: 'Pounded yam flour swallow',
            price: 1000, // $10.00 in cents
            unit: '5 Pieces',
            weight: 500,
            stock: 150,
            categoryId: grainsStaples.id,
            status: 'ACTIVE',
            isFeatured: true,
            updatedAt: new Date(),
        },
    });
    console.log('  ✓ Fufu');

    await prisma.products.upsert({
        where: { slug: 'tapioca' },
        update: {},
        create: {
            id: randomUUID(),
            name: 'Tapioca',
            slug: 'tapioca',
            description: 'Cassava flour for making eba',
            price: 1000, // $10.00 in cents
            unit: 'Pack',
            weight: 500,
            stock: 150,
            categoryId: grainsStaples.id,
            status: 'ACTIVE',
            isFeatured: false,
            updatedAt: new Date(),
        },
    });
    console.log('  ✓ Tapioca');

    // Proteins & Fish (4 products)
    await prisma.products.upsert({
        where: { slug: 'catfish' },
        update: {},
        create: {
            id: randomUUID(),
            name: 'Cat Fish',
            slug: 'catfish',
            description: 'Fresh catfish for pepper soup and stews',
            price: 3000, // $30.00 in cents
            unit: 'Pack',
            weight: 1000,
            stock: 150,
            categoryId: proteinsFish.id,
            status: 'ACTIVE',
            isFeatured: true,
            perishable: true,
            updatedAt: new Date(),
        },
    });
    console.log('  ✓ Cat Fish');

    await prisma.products.upsert({
        where: { slug: 'panla' },
        update: {},
        create: {
            id: randomUUID(),
            name: 'Panla',
            slug: 'panla',
            description: 'Dried hake fish',
            price: 2000, // $20.00 in cents
            unit: 'Pack',
            weight: 500,
            stock: 150,
            categoryId: proteinsFish.id,
            status: 'ACTIVE',
            isFeatured: false,
            updatedAt: new Date(),
        },
    });
    console.log('  ✓ Panla');

    await prisma.products.upsert({
        where: { slug: 'pomo' },
        update: {},
        create: {
            id: randomUUID(),
            name: 'Pomo',
            slug: 'pomo',
            description: 'Cow skin for soups and stews',
            price: 2000, // $20.00 in cents
            unit: 'Pack',
            weight: 1000,
            stock: 150,
            categoryId: proteinsFish.id,
            status: 'ACTIVE',
            isFeatured: false,
            updatedAt: new Date(),
        },
    });
    console.log('  ✓ Pomo');

    await prisma.products.upsert({
        where: { slug: 'kilishi' },
        update: {},
        create: {
            id: randomUUID(),
            name: 'Kilishi',
            slug: 'kilishi',
            description: 'Spicy dried beef (Nigerian jerky)',
            price: 1000, // $10.00 in cents
            unit: 'Pack',
            weight: 250,
            stock: 150,
            categoryId: proteinsFish.id,
            status: 'ACTIVE',
            isFeatured: true,
            updatedAt: new Date(),
        },
    });
    console.log('  ✓ Kilishi');

    // Spices & Ingredients (4 products)
    await prisma.products.upsert({
        where: { slug: 'crayfish' },
        update: {},
        create: {
            id: randomUUID(),
            name: 'Cray Fish',
            slug: 'crayfish',
            description: 'Ground crayfish for seasoning',
            price: 1000, // $10.00 in cents
            unit: 'Pack',
            weight: 200,
            stock: 150,
            categoryId: spicesIngredients.id,
            status: 'ACTIVE',
            isFeatured: false,
            updatedAt: new Date(),
        },
    });
    console.log('  ✓ Cray Fish');

    await prisma.products.upsert({
        where: { slug: 'egusi' },
        update: {},
        create: {
            id: randomUUID(),
            name: 'Egusi',
            slug: 'egusi',
            description: 'Ground melon seeds for egusi soup',
            price: 1000, // $10.00 in cents
            unit: 'Pack',
            weight: 500,
            stock: 150,
            categoryId: spicesIngredients.id,
            status: 'ACTIVE',
            isFeatured: true,
            updatedAt: new Date(),
        },
    });
    console.log('  ✓ Egusi');

    await prisma.products.upsert({
        where: { slug: 'iru-locust-beans' },
        update: {},
        create: {
            id: randomUUID(),
            name: 'Iru / Locust Beans',
            slug: 'iru-locust-beans',
            description: 'Fermented locust beans for traditional soups',
            price: 500, // $5.00 in cents
            unit: 'Pack',
            weight: 200,
            stock: 150,
            categoryId: spicesIngredients.id,
            status: 'ACTIVE',
            isFeatured: false,
            updatedAt: new Date(),
        },
    });
    console.log('  ✓ Iru / Locust Beans');

    await prisma.products.upsert({
        where: { slug: 'pepper-soup-ingredient' },
        update: {},
        create: {
            id: randomUUID(),
            name: 'Pepper Soup Ingredient',
            slug: 'pepper-soup-ingredient',
            description: 'Complete spice mix for authentic pepper soup',
            price: 1000, // $10.00 in cents
            unit: 'Pack',
            weight: 150,
            stock: 150,
            categoryId: spicesIngredients.id,
            status: 'ACTIVE',
            isFeatured: false,
            updatedAt: new Date(),
        },
    });
    console.log('  ✓ Pepper Soup Ingredient');

    // Ready Mixes (3 products)
    await prisma.products.upsert({
        where: { slug: 'ayamase-mix' },
        update: {},
        create: {
            id: randomUUID(),
            name: 'Ayamase Mix',
            slug: 'ayamase-mix',
            description: 'Pre-mixed ingredients for designer stew',
            price: 1000, // $10.00 in cents
            unit: 'Pack',
            weight: 400,
            stock: 150,
            categoryId: readyMixes.id,
            status: 'ACTIVE',
            isFeatured: true,
            updatedAt: new Date(),
        },
    });
    console.log('  ✓ Ayamase Mix');

    await prisma.products.upsert({
        where: { slug: 'ofada-mix' },
        update: {},
        create: {
            id: randomUUID(),
            name: 'Ofada Mix',
            slug: 'ofada-mix',
            description: 'Complete mix for Ofada rice sauce',
            price: 1000, // $10.00 in cents
            unit: 'Pack',
            weight: 400,
            stock: 150,
            categoryId: readyMixes.id,
            status: 'ACTIVE',
            isFeatured: true,
            updatedAt: new Date(),
        },
    });
    console.log('  ✓ Ofada Mix');

    await prisma.products.upsert({
        where: { slug: 'ewa-aganyin-mix' },
        update: {},
        create: {
            id: randomUUID(),
            name: 'Ewa Aganyin Mix',
            slug: 'ewa-aganyin-mix',
            description: 'Ready mix for mashed beans with sauce',
            price: 1000, // $10.00 in cents
            unit: 'Pack',
            weight: 350,
            stock: 150,
            categoryId: readyMixes.id,
            status: 'ACTIVE',
            isFeatured: false,
            updatedAt: new Date(),
        },
    });
    console.log('  ✓ Ewa Aganyin Mix\n');

    // 4. Summary
    const totalCategories = await prisma.categories.count();
    const totalProducts = await prisma.products.count();
    const totalUsers = await prisma.users.count();

    console.log('✅ Seeding complete!\n');
    console.log('📊 Summary:');
    console.log(`   Categories: ${totalCategories}`);
    console.log(`   Products: ${totalProducts}`);
    console.log(`   Users: ${totalUsers}`);
    console.log('\n🔑 Admin Login:');
    console.log('   Email: admin@rachelfoods.com');
    console.log('   Password: Admin123!');
}

main()
    .catch((e) => {
        console.error('❌ Seeding failed:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
