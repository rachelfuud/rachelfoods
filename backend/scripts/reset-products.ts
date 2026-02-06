import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'crypto';

const prisma = new PrismaClient({
    log: ['query', 'info', 'warn', 'error'],
});

async function main() {
    console.log('🔗 Connecting to database...\n');
    await prisma.$connect();
    console.log('✅ Connected successfully\n');

    console.log('🗑️  Deleting all existing products...\n');

    // Delete all product-related data (cascade will handle product_images, product_videos, etc.)
    const deletedProducts = await prisma.products.deleteMany({});
    console.log(`  ✓ Deleted ${deletedProducts.count} products\n`);

    console.log('🌱 Reseeding products with data from SEED_DATA.md...\n');

    // Create or get categories
    console.log('📁 Creating/verifying categories...');

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

    console.log('🍲 Creating products...\n');

    // Grains & Staples (3 products)
    await prisma.products.create({
        data: {
            id: randomUUID(),
            name: 'Fresh Ogi',
            slug: 'fresh-ogi',
            description: 'Fermented cereal pudding (pap)',
            price: 700, // $7.00 in cents
            unit: 'Wrap/Pack',
            weight: 500,
            stock: 980,
            categoryId: grainsStaples.id,
            status: 'ACTIVE',
            isFeatured: false,
            updatedAt: new Date(),
        },
    });
    console.log('  ✓ Fresh Ogi');

    await prisma.products.create({
        data: {
            id: randomUUID(),
            name: 'Fufu',
            slug: 'fufu',
            description: 'Pounded yam flour swallow',
            price: 1000, // $10.00 in cents
            unit: '5 Pieces',
            weight: 500,
            stock: 960,
            categoryId: grainsStaples.id,
            status: 'ACTIVE',
            isFeatured: true,
            updatedAt: new Date(),
        },
    });
    console.log('  ✓ Fufu');

    await prisma.products.create({
        data: {
            id: randomUUID(),
            name: 'Tapioca',
            slug: 'tapioca',
            description: 'Cassava flour for making eba',
            price: 1000, // $10.00 in cents
            unit: 'Pack',
            weight: 500,
            stock: 970,
            categoryId: grainsStaples.id,
            status: 'ACTIVE',
            isFeatured: false,
            updatedAt: new Date(),
        },
    });
    console.log('  ✓ Tapioca\n');

    // Proteins & Fish (4 products)
    await prisma.products.create({
        data: {
            id: randomUUID(),
            name: 'Cat Fish',
            slug: 'catfish',
            description: 'Fresh catfish for pepper soup and stews',
            price: 3000, // $30.00 in cents
            unit: 'Pack',
            weight: 1000,
            stock: 930,
            categoryId: proteinsFish.id,
            status: 'ACTIVE',
            isFeatured: true,
            perishable: true,
            updatedAt: new Date(),
        },
    });
    console.log('  ✓ Cat Fish');

    await prisma.products.create({
        data: {
            id: randomUUID(),
            name: 'Panla',
            slug: 'panla',
            description: 'Dried hake fish',
            price: 2000, // $20.00 in cents
            unit: 'Pack',
            weight: 500,
            stock: 950,
            categoryId: proteinsFish.id,
            status: 'ACTIVE',
            isFeatured: false,
            updatedAt: new Date(),
        },
    });
    console.log('  ✓ Panla');

    await prisma.products.create({
        data: {
            id: randomUUID(),
            name: 'Pomo',
            slug: 'pomo',
            description: 'Cow skin for soups and stews',
            price: 2000, // $20.00 in cents
            unit: 'Pack',
            weight: 1000,
            stock: 940,
            categoryId: proteinsFish.id,
            status: 'ACTIVE',
            isFeatured: false,
            updatedAt: new Date(),
        },
    });
    console.log('  ✓ Pomo');

    await prisma.products.create({
        data: {
            id: randomUUID(),
            name: 'Kilishi',
            slug: 'kilishi',
            description: 'Spicy dried beef (Nigerian jerky)',
            price: 1000, // $10.00 in cents
            unit: 'Pack',
            weight: 250,
            stock: 935,
            categoryId: proteinsFish.id,
            status: 'ACTIVE',
            isFeatured: true,
            updatedAt: new Date(),
        },
    });
    console.log('  ✓ Kilishi\n');

    // Spices & Ingredients (4 products)
    await prisma.products.create({
        data: {
            id: randomUUID(),
            name: 'Cray Fish',
            slug: 'crayfish',
            description: 'Ground crayfish for seasoning',
            price: 1000, // $10.00 in cents
            unit: 'Pack',
            weight: 200,
            stock: 990,
            categoryId: spicesIngredients.id,
            status: 'ACTIVE',
            isFeatured: false,
            updatedAt: new Date(),
        },
    });
    console.log('  ✓ Cray Fish');

    await prisma.products.create({
        data: {
            id: randomUUID(),
            name: 'Egusi',
            slug: 'egusi',
            description: 'Ground melon seeds for egusi soup',
            price: 1000, // $10.00 in cents
            unit: 'Pack',
            weight: 500,
            stock: 975,
            categoryId: spicesIngredients.id,
            status: 'ACTIVE',
            isFeatured: true,
            updatedAt: new Date(),
        },
    });
    console.log('  ✓ Egusi');

    await prisma.products.create({
        data: {
            id: randomUUID(),
            name: 'Iru / Locust Beans',
            slug: 'iru-locust-beans',
            description: 'Fermented locust beans for traditional soups',
            price: 500, // $5.00 in cents
            unit: 'Pack',
            weight: 200,
            stock: 960,
            categoryId: spicesIngredients.id,
            status: 'ACTIVE',
            isFeatured: false,
            updatedAt: new Date(),
        },
    });
    console.log('  ✓ Iru / Locust Beans');

    await prisma.products.create({
        data: {
            id: randomUUID(),
            name: 'Pepper Soup Ingredient',
            slug: 'pepper-soup-ingredient',
            description: 'Complete spice mix for authentic pepper soup',
            price: 1000, // $10.00 in cents
            unit: 'Pack',
            weight: 150,
            stock: 985,
            categoryId: spicesIngredients.id,
            status: 'ACTIVE',
            isFeatured: false,
            updatedAt: new Date(),
        },
    });
    console.log('  ✓ Pepper Soup Ingredient\n');

    // Ready Mixes (3 products)
    await prisma.products.create({
        data: {
            id: randomUUID(),
            name: 'Ayamase Mix',
            slug: 'ayamase-mix',
            description: 'Pre-mixed ingredients for designer stew',
            price: 1000, // $10.00 in cents
            unit: 'Pack',
            weight: 400,
            stock: 940,
            categoryId: readyMixes.id,
            status: 'ACTIVE',
            isFeatured: true,
            updatedAt: new Date(),
        },
    });
    console.log('  ✓ Ayamase Mix');

    await prisma.products.create({
        data: {
            id: randomUUID(),
            name: 'Ofada Mix',
            slug: 'ofada-mix',
            description: 'Complete mix for Ofada rice sauce',
            price: 1000, // $10.00 in cents
            unit: 'Pack',
            weight: 400,
            stock: 945,
            categoryId: readyMixes.id,
            status: 'ACTIVE',
            isFeatured: true,
            updatedAt: new Date(),
        },
    });
    console.log('  ✓ Ofada Mix');

    await prisma.products.create({
        data: {
            id: randomUUID(),
            name: 'Ewa Aganyin Mix',
            slug: 'ewa-aganyin-mix',
            description: 'Ready mix for mashed beans with sauce',
            price: 1000, // $10.00 in cents
            unit: 'Pack',
            weight: 350,
            stock: 950,
            categoryId: readyMixes.id,
            status: 'ACTIVE',
            isFeatured: false,
            updatedAt: new Date(),
        },
    });
    console.log('  ✓ Ewa Aganyin Mix\n');

    console.log('✅ Product reset complete!\n');
    console.log('📊 Summary:');
    console.log('  • Total Products: 14');
    console.log('  • Categories: 4');
    console.log('  • Featured Products: 6');
    console.log('  • Price Range: $5.00 - $30.00');
    console.log('  • Total Stock: 13,185 units\n');
}

main()
    .catch((e) => {
        console.error('❌ Error resetting products:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
