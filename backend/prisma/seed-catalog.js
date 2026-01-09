// Seed script for Rachel Foods product catalog
// Based on SEED_DATA.md - Real products only

const { PrismaClient } = require('@prisma/client');
const { v4: uuidv4 } = require('uuid');

const prisma = new PrismaClient();

// Helper function to create slug
function createSlug(name) {
    return name.toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
}

// Categories from SEED_DATA.md
const CATEGORIES = [
    {
        name: 'Grains & Staples',
        description: 'Essential grains and staple foods'
    },
    {
        name: 'Proteins',
        description: 'Fresh proteins including fish and meat'
    },
    {
        name: 'Spices & Ingredients',
        description: 'Traditional spices and cooking ingredients'
    },
    {
        name: 'Ready Mixes',
        description: 'Ready-to-cook traditional meal mixes'
    },
    {
        name: 'Custom Requests',
        description: 'Special requested items'
    }
];

// Products from SEED_DATA.md
const PRODUCTS = [
    // Grains & Staples
    { name: 'Ofada Rice', category: 'Grains & Staples', price: 2500, unit: 'kg', weight: 1.0, description: 'Premium quality Ofada rice, locally grown' },
    { name: 'White Rice', category: 'Grains & Staples', price: 1800, unit: 'kg', weight: 1.0, description: 'Quality white rice' },
    { name: 'Fufu', category: 'Grains & Staples', price: 500, unit: 'pack', weight: 0.5, description: 'Traditional fufu flour' },
    { name: 'Tapioca', category: 'Grains & Staples', price: 800, unit: 'kg', weight: 1.0, description: 'Fresh tapioca' },
    { name: 'Ogi', category: 'Grains & Staples', price: 600, unit: 'pack', weight: 0.5, description: 'Fermented cereal pudding' },
    
    // Proteins
    { name: 'Cat Fish', category: 'Proteins', price: 3500, unit: 'kg', weight: 1.0, description: 'Fresh catfish', perishable: true },
    { name: 'Panla', category: 'Proteins', price: 2800, unit: 'kg', weight: 1.0, description: 'Dried Hake fish (Panla)', perishable: true },
    { name: 'Pomo', category: 'Proteins', price: 1500, unit: 'kg', weight: 1.0, description: 'Cow skin (Pomo)', perishable: true },
    { name: 'Kilishi', category: 'Proteins', price: 4000, unit: 'pack', weight: 0.3, description: 'Traditional spiced dried meat' },
    
    // Spices & Ingredients
    { name: 'Cray Fish', category: 'Spices & Ingredients', price: 2000, unit: 'pack', weight: 0.2, description: 'Ground crayfish' },
    { name: 'Egusi', category: 'Spices & Ingredients', price: 1200, unit: 'pack', weight: 0.5, description: 'Melon seeds (Egusi)' },
    { name: 'Iru (Locust Beans)', category: 'Spices & Ingredients', price: 800, unit: 'pack', weight: 0.2, description: 'Fermented locust beans' },
    { name: 'Pepper Soup Ingredients', category: 'Spices & Ingredients', price: 1500, unit: 'pack', weight: 0.3, description: 'Complete pepper soup spice mix' },
    
    // Ready Mixes
    { name: 'Ayamase Mix', category: 'Ready Mixes', price: 2500, unit: 'pack', weight: 0.5, description: 'Traditional Ayamase sauce ingredients', perishable: true },
    { name: 'Ofada Mix', category: 'Ready Mixes', price: 3000, unit: 'pack', weight: 0.5, description: 'Complete Ofada sauce ingredients', perishable: true },
    { name: 'Ewa Aganyin Mix', category: 'Ready Mixes', price: 2200, unit: 'pack', weight: 0.5, description: 'Ewa Aganyin beans sauce mix', perishable: true }
];

async function seedCatalog() {
    console.log('🌱 Starting catalog seed...\n');

    try {
        // Step 1: Create categories
        console.log('📁 Creating categories...');
        const categoryMap = {};

        for (const cat of CATEGORIES) {
            const existing = await prisma.categories.findFirst({
                where: { name: cat.name }
            });

            if (existing) {
                console.log(`  ✓ Category exists: ${cat.name}`);
                categoryMap[cat.name] = existing.id;
            } else {
                const created = await prisma.categories.create({
                    data: {
                        id: uuidv4(),
                        name: cat.name,
                        slug: createSlug(cat.name),
                        description: cat.description,
                        status: 'ACTIVE'
                    }
                });
                categoryMap[cat.name] = created.id;
                console.log(`  ✓ Created: ${cat.name}`);
            }
        }

        console.log(`\n✅ ${Object.keys(categoryMap).length} categories ready\n`);

        // Step 2: Create products
        console.log('🛒 Creating products...');
        let created = 0;
        let skipped = 0;

        for (const product of PRODUCTS) {
            const existing = await prisma.products.findFirst({
                where: { slug: createSlug(product.name) }
            });

            if (existing) {
                console.log(`  ⊗ Product exists: ${product.name}`);
                skipped++;
                continue;
            }

            await prisma.products.create({
                data: {
                    id: uuidv4(),
                    name: product.name,
                    slug: createSlug(product.name),
                    description: product.description,
                    price: product.price,
                    unit: product.unit,
                    weight: product.weight,
                    stock: 50, // Default stock
                    perishable: product.perishable || false,
                    categoryId: categoryMap[product.category],
                    status: 'PUBLISHED',
                    images: [], // To be updated with actual images later
                    updatedAt: new Date()
                }
            });

            console.log(`  ✓ Created: ${product.name} (₦${product.price}/${product.unit})`);
            created++;
        }

        console.log(`\n✅ Catalog seeded successfully!`);
        console.log(`   - ${created} products created`);
        console.log(`   - ${skipped} products skipped (already exist)`);
        console.log(`\n🎉 Done! Products are now visible in your catalog.\n`);

    } catch (error) {
        console.error('❌ Seed failed:', error.message);
        throw error;
    } finally {
        await prisma.$disconnect();
    }
}

// Run the seed
seedCatalog();
