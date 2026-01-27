const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function checkAdmin() {
    try {
        const user = await prisma.users.findUnique({
            where: { email: 'admin@rachelfoods.com' }
        });

        if (user) {
            console.log('✓ User found:', user.email);
            console.log('✓ Role:', user.role);
            const isValid = await bcrypt.compare('Admin123!', user.password);
            console.log('✓ Password valid:', isValid);
        } else {
            console.log('✗ User not found');
        }
    } catch (e) {
        console.error('Error:', e.message);
    } finally {
        await prisma.$disconnect();
    }
}

checkAdmin();
