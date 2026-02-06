import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    try {
        console.log('Testing database connection...');
        await prisma.$connect();
        console.log('✅ Successfully connected to database');

        const productCount = await prisma.products.count();
        console.log(`📦 Current products in database: ${productCount}`);

        const categoryCount = await prisma.categories.count();
        console.log(`📁 Current categories in database: ${categoryCount}`);

    } catch (error) {
        console.error('❌ Database connection failed:', error.message);
    }
}

main()
    .finally(async () => {
        await prisma.$disconnect();
    });
