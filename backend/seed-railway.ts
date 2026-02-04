import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { randomUUID } from 'crypto';

const prisma = new PrismaClient();

async function main() {
    console.log('🌱 Starting comprehensive Railway database seed...\n');

    // 1. Create Roles (RBAC)
    console.log('🔐 Creating roles...');

    const adminRole = await prisma.roles.upsert({
        where: { slug: 'admin' },
        update: {},
        create: {
            id: randomUUID(),
            name: 'Admin',
            slug: 'admin',
            description: 'Full system access with all permissions',
            isActive: true,
        },
    });
    console.log(`  ✓ ${adminRole.name}`);

    const staffRole = await prisma.roles.upsert({
        where: { slug: 'staff' },
        update: {},
        create: {
            id: randomUUID(),
            name: 'Staff',
            slug: 'staff',
            description: 'Limited admin access for staff members',
            isActive: true,
        },
    });
    console.log(`  ✓ ${staffRole.name}`);

    const buyerRole = await prisma.roles.upsert({
        where: { slug: 'buyer' },
        update: {},
        create: {
            id: randomUUID(),
            name: 'Buyer',
            slug: 'buyer',
            description: 'Customer who can purchase products',
            isActive: true,
        },
    });
    console.log(`  ✓ ${buyerRole.name}\n`);

    // 2. Create Permissions
    console.log('🔑 Creating permissions...');

    const permissions = [
        { action: 'CREATE', resource: 'products', description: 'Create new products' },
        { action: 'UPDATE', resource: 'products', description: 'Update existing products' },
        { action: 'DELETE', resource: 'products', description: 'Delete products' },
        { action: 'VIEW', resource: 'products', description: 'View products' },
        { action: 'CREATE', resource: 'orders', description: 'Create orders' },
        { action: 'UPDATE', resource: 'orders', description: 'Update order status' },
        { action: 'DELETE', resource: 'orders', description: 'Cancel orders' },
        { action: 'VIEW', resource: 'orders', description: 'View orders' },
        { action: 'CREATE', resource: 'users', description: 'Create users' },
        { action: 'UPDATE', resource: 'users', description: 'Update users' },
        { action: 'DELETE', resource: 'users', description: 'Delete users' },
        { action: 'VIEW', resource: 'users', description: 'View users' },
        { action: 'VIEW', resource: 'analytics', description: 'View business analytics' },
        { action: 'MANAGE', resource: 'coupons', description: 'Manage promotional coupons' },
        { action: 'MANAGE', resource: 'wallet', description: 'Manage customer wallets' },
        { action: 'PROCESS', resource: 'refunds', description: 'Process refunds' },
    ];

    const createdPermissions = [];
    for (const perm of permissions) {
        const permission = await prisma.permissions.upsert({
            where: {
                action_resource: {
                    action: perm.action,
                    resource: perm.resource,
                },
            },
            update: {},
            create: {
                id: randomUUID(),
                action: perm.action,
                resource: perm.resource,
                description: perm.description,
            },
        });
        createdPermissions.push(permission);
    }
    console.log(`  ✓ Created ${createdPermissions.length} permissions\n`);

    // 3. Assign Permissions to Roles
    console.log('🔗 Assigning permissions to roles...');

    // Admin gets all permissions
    for (const permission of createdPermissions) {
        await prisma.role_permissions.upsert({
            where: {
                roleId_permissionId: {
                    roleId: adminRole.id,
                    permissionId: permission.id,
                },
            },
            update: {},
            create: {
                id: randomUUID(),
                roleId: adminRole.id,
                permissionId: permission.id,
            },
        });
    }
    console.log(`  ✓ Admin: All permissions (${createdPermissions.length})`);

    // Staff gets limited permissions (no delete)
    const staffPermissions = createdPermissions.filter(p => p.action !== 'DELETE');
    for (const permission of staffPermissions) {
        await prisma.role_permissions.upsert({
            where: {
                roleId_permissionId: {
                    roleId: staffRole.id,
                    permissionId: permission.id,
                },
            },
            update: {},
            create: {
                id: randomUUID(),
                roleId: staffRole.id,
                permissionId: permission.id,
            },
        });
    }
    console.log(`  ✓ Staff: ${staffPermissions.length} permissions`);

    // Buyer gets only view and create order permissions
    const buyerPermissions = createdPermissions.filter(p =>
        (p.resource === 'products' && p.action === 'VIEW') ||
        (p.resource === 'orders' && (p.action === 'CREATE' || p.action === 'VIEW'))
    );
    for (const permission of buyerPermissions) {
        await prisma.role_permissions.upsert({
            where: {
                roleId_permissionId: {
                    roleId: buyerRole.id,
                    permissionId: permission.id,
                },
            },
            update: {},
            create: {
                id: randomUUID(),
                roleId: buyerRole.id,
                permissionId: permission.id,
            },
        });
    }
    console.log(`  ✓ Buyer: ${buyerPermissions.length} permissions\n`);

    // 4. Create Admin User
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
            updatedAt: new Date(),
        },
    });
    console.log(`✓ Admin created: ${admin.email}`);

    // 5. Assign Admin Role to Admin User
    await prisma.user_roles.upsert({
        where: {
            userId_roleId: {
                userId: admin.id,
                roleId: adminRole.id,
            },
        },
        update: {},
        create: {
            id: randomUUID(),
            userId: admin.id,
            roleId: adminRole.id,
        },
    });
    console.log(`✓ Admin role assigned to admin user\n`);

    // 6. Create Platform Fee Config
    console.log('💰 Creating platform fee configuration...');

    await prisma.platform_fee_config.upsert({
        where: { id: 'default-fee' },
        update: {},
        create: {
            id: 'default-fee',
            name: 'Default Platform Fee',
            description: 'Standard 5% platform fee on all orders',
            feeType: 'PERCENTAGE',
            feeValue: 5.00,
            isActive: true,
            updatedAt: new Date(),
        },
    });
    console.log(`  ✓ Default platform fee (5%)\n`);

    // 7. Create Theme Config
    console.log('🎨 Creating theme configuration...');

    await prisma.theme_config.upsert({
        where: { id: 'default-theme' },
        update: {},
        create: {
            id: 'default-theme',
            primaryColor: '#16a34a',
            secondaryColor: '#ea580c',
            accentColor: '#dc2626',
            defaultMode: 'light',
            isActive: true,
        },
    });
    console.log(`  ✓ Default theme configuration\n`);

    // 8. Create Categories
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

    // 9. Create Product Variants (Optional - for products with size/weight options)
    console.log('📦 Creating product variants...');

    // Fufu variants (different pack sizes)
    const fufu = await prisma.products.findUnique({ where: { slug: 'fufu' } });
    if (fufu) {
        await prisma.product_variants.upsert({
            where: { id: 'fufu-small' },
            update: {},
            create: {
                id: 'fufu-small',
                productId: fufu.id,
                name: 'Small Pack (3 pieces)',
                sku: 'FUFU-SM-3',
                price: 600,
                stock: 200,
                isActive: true,
                updatedAt: new Date(),
            },
        });

        await prisma.product_variants.upsert({
            where: { id: 'fufu-large' },
            update: {},
            create: {
                id: 'fufu-large',
                productId: fufu.id,
                name: 'Large Pack (10 pieces)',
                sku: 'FUFU-LG-10',
                price: 1800,
                stock: 100,
                isActive: true,
                updatedAt: new Date(),
            },
        });
        console.log(`  ✓ Fufu variants (2)`);
    }

    // Catfish variants (different weights)
    const catfish = await prisma.products.findUnique({ where: { slug: 'catfish' } });
    if (catfish) {
        await prisma.product_variants.upsert({
            where: { id: 'catfish-500g' },
            update: {},
            create: {
                id: 'catfish-500g',
                productId: catfish.id,
                name: '500g Pack',
                sku: 'CATFISH-500G',
                price: 1500,
                stock: 150,
                isActive: true,
                updatedAt: new Date(),
            },
        });

        await prisma.product_variants.upsert({
            where: { id: 'catfish-1kg' },
            update: {},
            create: {
                id: 'catfish-1kg',
                productId: catfish.id,
                name: '1kg Pack',
                sku: 'CATFISH-1KG',
                price: 2800,
                stock: 150,
                isActive: true,
                updatedAt: new Date(),
            },
        });
        console.log(`  ✓ Cat Fish variants (2)\n`);
    }

    // 10. Summary
    const totalCategories = await prisma.categories.count();
    const totalProducts = await prisma.products.count();
    const totalUsers = await prisma.users.count();
    const totalRoles = await prisma.roles.count();
    const totalPermissions = await prisma.permissions.count();
    const totalVariants = await prisma.product_variants.count();

    console.log('✅ Seeding complete!\n');
    console.log('📊 Summary:');
    console.log(`   Roles: ${totalRoles}`);
    console.log(`   Permissions: ${totalPermissions}`);
    console.log(`   Categories: ${totalCategories}`);
    console.log(`   Products: ${totalProducts}`);
    console.log(`   Product Variants: ${totalVariants}`);
    console.log(`   Users: ${totalUsers}`);
    console.log(`   Platform Fee Config: 1`);
    console.log(`   Theme Config: 1`);
    console.log('\n🔑 Admin Login:');
    console.log('   Email: admin@rachelfoods.com');
    console.log('   Password: Admin123!');
    console.log('\n🎯 Roles Available:');
    console.log('   - Admin (full access)');
    console.log('   - Staff (limited admin access)');
    console.log('   - Buyer (customer access)');
}

main()
    .catch((e) => {
        console.error('❌ Seeding failed:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
