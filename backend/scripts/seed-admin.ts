import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function seedAdminUser() {
    try {
        console.log('🌱 Seeding admin user...');

        // Get admin email from environment or use default
        const adminEmail = process.env.ADMIN_EMAIL || 'admin@rachelfoods.com';
        const adminPassword = process.env.ADMIN_PASSWORD || 'Admin123!';

        // Find or create platform-admin role (with migration support)
        // First, try to find by new slug
        let platformAdminRole = await prisma.roles.findUnique({
            where: { slug: 'PLATFORM_ADMIN' },
        });

        // If not found, check if old slug exists and update it
        if (!platformAdminRole) {
            const oldRole = await prisma.roles.findUnique({
                where: { slug: 'platform-admin' },
            });

            if (oldRole) {
                console.log('⚠️  Migrating old platform-admin role to PLATFORM_ADMIN...');
                platformAdminRole = await prisma.roles.update({
                    where: { id: oldRole.id },
                    data: { slug: 'PLATFORM_ADMIN' },
                });
                console.log('✅ Migrated Platform Admin role');
            } else {
                console.log('⚠️  Platform Admin role not found. Creating it...');
                platformAdminRole = await prisma.roles.create({
                    data: {
                        id: crypto.randomUUID(),
                        name: 'Platform Admin',
                        slug: 'PLATFORM_ADMIN',
                        description: 'Full system access and platform configuration',
                        isActive: true,
                        createdAt: new Date(),
                        updatedAt: new Date(),
                    },
                });
                console.log('✅ Created Platform Admin role');
            }
        }

        // Check if admin user exists
        let adminUser = await prisma.users.findFirst({
            where: { email: adminEmail },
            include: {
                user_roles: {
                    include: {
                        roles: true,
                    },
                },
            },
        });

        if (adminUser) {
            // Check if user already has platform-admin role
            const hasPlatformAdmin = adminUser.user_roles.some(
                (ur) => ur.roles.slug === 'PLATFORM_ADMIN'
            );

            if (hasPlatformAdmin) {
                console.log('✅ Admin user already exists with Platform Admin role:', adminEmail);
                return;
            }

            // Add platform-admin role to existing user
            await prisma.user_roles.create({
                data: {
                    id: crypto.randomUUID(),
                    userId: adminUser.id,
                    roleId: platformAdminRole.id,
                    assignedAt: new Date(),
                },
            });

            console.log('✅ Added Platform Admin role to existing user:', adminEmail);
        } else {
            // Create new admin user
            const hashedPassword = await bcrypt.hash(adminPassword, 10);

            adminUser = await prisma.users.create({
                data: {
                    id: `usr_${crypto.randomUUID()}`,
                    email: adminEmail,
                    password: hashedPassword,
                    firstName: 'Admin',
                    lastName: 'User',
                    status: 'ACTIVE',
                    createdAt: new Date(),
                    updatedAt: new Date(),
                    user_roles: {
                        create: {
                            id: crypto.randomUUID(),
                            roleId: platformAdminRole.id,
                            assignedAt: new Date(),
                        },
                    },
                },
                include: {
                    user_roles: {
                        include: {
                            roles: true,
                        },
                    },
                },
            });

            console.log('✅ Created admin user:', adminUser.email);
            console.log('   Email:', adminEmail);
            console.log('   Password:', adminPassword);
            console.log('   Role: Platform Admin (full system access)');
            console.log('   ⚠️  CHANGE THIS PASSWORD IMMEDIATELY!');
        }

        console.log('✅ Admin seeding complete!');
    } catch (error) {
        console.error('❌ Error seeding admin user:', error);
        throw error;
    } finally {
        await prisma.$disconnect();
    }
}

seedAdminUser()
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
