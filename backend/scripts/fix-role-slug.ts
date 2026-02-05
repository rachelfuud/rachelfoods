import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function fixRoleSlug() {
    try {
        console.log('🔧 Fixing role slug from platform-admin to PLATFORM_ADMIN...');

        // Update the role slug
        const result = await prisma.roles.updateMany({
            where: {
                slug: 'platform-admin',
            },
            data: {
                slug: 'PLATFORM_ADMIN',
            },
        });

        console.log(`✅ Updated ${result.count} role(s)`);

        // Verify the change
        const updatedRole = await prisma.roles.findUnique({
            where: { slug: 'PLATFORM_ADMIN' },
            include: {
                user_roles: {
                    include: {
                        users: {
                            select: {
                                email: true,
                            },
                        },
                    },
                },
            },
        });

        if (updatedRole) {
            console.log(`✅ Role successfully updated:`);
            console.log(`   - Name: ${updatedRole.name}`);
            console.log(`   - Slug: ${updatedRole.slug}`);
            console.log(`   - Users assigned: ${updatedRole.user_roles.length}`);
            updatedRole.user_roles.forEach((ur) => {
                console.log(`     • ${ur.users.email}`);
            });
        } else {
            console.warn('⚠️  PLATFORM_ADMIN role not found after update');
        }

        await prisma.$disconnect();
    } catch (error) {
        console.error('❌ Error fixing role slug:', error);
        await prisma.$disconnect();
        process.exit(1);
    }
}

fixRoleSlug();
