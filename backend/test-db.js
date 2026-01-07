const { PrismaClient } = require('@prisma/client');

async function testConnection() {
    const prisma = new PrismaClient({
        log: ['query', 'info', 'warn', 'error'],
    });

    try {
        console.log('Testing database connection...');
        await prisma.$connect();
        console.log('✓ Successfully connected to database!');

        const result = await prisma.$queryRaw`SELECT version()`;
        console.log('PostgreSQL version:', result);

    } catch (error) {
        console.error('✗ Connection failed:', error.message);
        console.error('Full error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

testConnection();
