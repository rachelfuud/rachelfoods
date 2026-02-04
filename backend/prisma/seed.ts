import { PrismaClient, Prisma, ProductStatus } from '@prisma/client';

const prisma = new PrismaClient();

// Define roles
const roles = [
    {
        name: 'Platform Admin',
        slug: 'platform-admin',
        description: 'Full system access and platform configuration',
    },
    {
        name: 'Store Owner',
        slug: 'store-owner',
        description: 'Manages their own store, confirms orders, controls products and pricing',
    },
    {
        name: 'Buyer',
        slug: 'buyer',
        description: 'Places orders, requests kitchen refill, tracks orders, submits reviews',
    },
    {
        name: 'Delivery Agent',
        slug: 'delivery-agent',
        description: 'Updates shipping status for assigned deliveries',
    },
];

// Define permissions using (action, resource) pattern
const permissions = [
    // Category permissions
    { action: 'create', resource: 'category', description: 'Create new categories' },
    { action: 'update', resource: 'category', description: 'Update existing categories' },
    { action: 'delete', resource: 'category', description: 'Delete categories' },
    { action: 'view', resource: 'category', description: 'View categories' },

    // Product permissions
    { action: 'create', resource: 'product', description: 'Create new products' },
    { action: 'update', resource: 'product', description: 'Update existing products' },
    { action: 'delete', resource: 'product', description: 'Delete products' },
    { action: 'view', resource: 'product', description: 'View products' },
    { action: 'disable', resource: 'product', description: 'Disable products temporarily' },

    // Order permissions
    { action: 'create', resource: 'order', description: 'Create new orders' },
    { action: 'view', resource: 'order', description: 'View orders' },
    { action: 'confirm', resource: 'order', description: 'Confirm orders before payment' },
    { action: 'cancel', resource: 'order', description: 'Cancel orders' },
    { action: 'update', resource: 'order', description: 'Update order details' },

    // Shipping permissions
    { action: 'view', resource: 'shipping', description: 'View shipping information' },
    { action: 'override', resource: 'shipping', description: 'Override shipping cost' },
    { action: 'update_status', resource: 'shipping', description: 'Update shipping status' },
    { action: 'assign', resource: 'shipping', description: 'Assign shipping provider' },

    // Payment permissions
    { action: 'view', resource: 'payment', description: 'View payment information' },
    { action: 'enable_cod', resource: 'payment', description: 'Enable cash on delivery' },
    { action: 'enable_prepaid', resource: 'payment', description: 'Enable prepaid payment' },
    { action: 'confirm', resource: 'payment', description: 'Confirm payment received' },

    // Review permissions
    { action: 'create', resource: 'review', description: 'Create reviews' },
    { action: 'view', resource: 'review', description: 'View reviews' },
    { action: 'moderate', resource: 'review', description: 'Moderate reviews' },

    // Referral permissions
    { action: 'create', resource: 'referral', description: 'Create referrals' },
    { action: 'view', resource: 'referral', description: 'View referral information' },
    { action: 'configure', resource: 'referral', description: 'Configure referral program' },

    // User permissions
    { action: 'create', resource: 'user', description: 'Create new users' },
    { action: 'view', resource: 'user', description: 'View user information' },
    { action: 'update', resource: 'user', description: 'Update user information' },
    { action: 'disable', resource: 'user', description: 'Disable user accounts' },

    // Role permissions
    { action: 'assign', resource: 'role', description: 'Assign roles to users' },
    { action: 'view', resource: 'role', description: 'View roles' },
    { action: 'create', resource: 'role', description: 'Create new roles' },
    { action: 'update', resource: 'role', description: 'Update roles' },

    // System permissions
    { action: 'configure', resource: 'system', description: 'Configure system settings' },
    { action: 'view', resource: 'system', description: 'View system information' },

    // Theme permissions
    { action: 'manage', resource: 'theme', description: 'Manage theme and branding' },

    // Notification permissions
    { action: 'configure', resource: 'notification', description: 'Configure notifications' },
    { action: 'send', resource: 'notification', description: 'Send notifications' },
];

// Role-Permission mapping based on ROLE_PERMISSION_MATRIX.md
const rolePermissions: Record<string, string[]> = {
    'platform-admin': [
        // Admin has all permissions
        'category.create',
        'category.update',
        'category.delete',
        'category.view',
        'product.create',
        'product.update',
        'product.delete',
        'product.view',
        'product.disable',
        'order.view',
        'order.confirm',
        'order.cancel',
        'order.update',
        'shipping.view',
        'shipping.override',
        'shipping.assign',
        'payment.view',
        'review.view',
        'review.moderate',
        'referral.view',
        'referral.configure',
        'user.create',
        'user.view',
        'user.update',
        'user.disable',
        'role.assign',
        'role.view',
        'role.create',
        'role.update',
        'system.configure',
        'system.view',
        'theme.manage',
        'notification.configure',
        'notification.send',
    ],
    'store-owner': [
        // Seller controls their store
        'category.create',
        'category.update',
        'category.view',
        'product.create',
        'product.update',
        'product.delete',
        'product.view',
        'product.disable',
        'order.view',
        'order.confirm',
        'order.cancel',
        'order.update',
        'shipping.view',
        'shipping.override',
        'shipping.assign',
        'payment.view',
        'payment.enable_cod',
        'payment.enable_prepaid',
        'payment.confirm',
        'review.view',
        'review.moderate',
        'referral.view',
        'notification.send',
    ],
    buyer: [
        // Buyer can place orders and interact with products
        'category.view',
        'product.view',
        'order.create',
        'order.view',
        'order.cancel',
        'shipping.view',
        'payment.view',
        'review.create',
        'review.view',
        'referral.create',
        'referral.view',
        'user.view',
    ],
    'delivery-agent': [
        // Delivery agent can only update shipping status
        'order.view',
        'shipping.view',
        'shipping.update_status',
    ],
};

async function main() {
    console.log('🌱 Starting RBAC seed...\n');

    // 1. Create or update roles
    console.log('📋 Creating roles...');
    const createdRoles: Record<string, any> = {};

    for (const role of roles) {
        const upsertedRole = await prisma.roles.upsert({
            where: { slug: role.slug },
            update: {
                name: role.name,
                description: role.description,
                isActive: true,
            },
            create: role,
        });
        createdRoles[role.slug] = upsertedRole;
        console.log(`  ✓ ${role.name} (${role.slug})`);
    }

    // 2. Create or update permissions
    console.log('\n🔐 Creating permissions...');
    const createdPermissions: Record<string, any> = {};

    for (const permission of permissions) {
        const upsertedPermission = await prisma.permissions.upsert({
            where: {
                action_resource: {
                    action: permission.action,
                    resource: permission.resource,
                },
            },
            update: {
                description: permission.description,
            },
            create: permission,
        });
        const key = `${permission.resource}.${permission.action}`;
        createdPermissions[key] = upsertedPermission;
        console.log(`  ✓ ${key}`);
    }

    // 3. Assign permissions to roles
    console.log('\n🔗 Assigning permissions to roles...');

    for (const [roleSlug, permissionKeys] of Object.entries(rolePermissions)) {
        const role = createdRoles[roleSlug];
        if (!role) {
            console.warn(`  ⚠ Role ${roleSlug} not found, skipping...`);
            continue;
        }

        console.log(`\n  ${role.name}:`);
        let assignedCount = 0;

        for (const permissionKey of permissionKeys) {
            const permission = createdPermissions[permissionKey];
            if (!permission) {
                console.warn(`    ⚠ Permission ${permissionKey} not found, skipping...`);
                continue;
            }

            // Check if already assigned
            const existing = await prisma.role_permissions.findFirst({
                where: {
                    roleId: role.id,
                    permissionId: permission.id,
                },
            });

            if (!existing) {
                await prisma.role_permissions.create({
                    data: {
                        roleId: role.id,
                        permissionId: permission.id,
                    },
                });
                assignedCount++;
            }
        }

        console.log(`    ✓ Assigned ${assignedCount} permissions (total: ${permissionKeys.length})`);
    }

    // 4. Summary
    console.log('\n📊 Seed Summary:');
    const roleCount = await prisma.roles.count();
    const permissionCount = await prisma.permissions.count();
    const assignmentCount = await prisma.role_permissions.count();

    console.log(`  • Roles: ${roleCount}`);
    console.log(`  • Permissions: ${permissionCount}`);
    console.log(`  • Role-Permission Assignments: ${assignmentCount}`);

    console.log('\n✅ RBAC seed completed successfully!\n');

    // 5. Create sample categories
    console.log('\n📁 Creating sample categories...');
    const sampleCategories = [
        { id: crypto.randomUUID(), name: 'Vegetables', slug: 'vegetables', description: 'Fresh and dry vegetables', updatedAt: new Date() },
        { id: crypto.randomUUID(), name: 'Grains & Legumes', slug: 'grains', description: 'Rice, beans, and pulses', updatedAt: new Date() },
        { id: crypto.randomUUID(), name: 'Spices & Seasonings', slug: 'spices', description: 'Traditional spices and seasonings', updatedAt: new Date() },
        { id: crypto.randomUUID(), name: 'Oils & Condiments', slug: 'oils', description: 'Cooking oils and sauces', updatedAt: new Date() },
        { id: crypto.randomUUID(), name: 'Snacks', slug: 'snacks', description: 'Traditional snacks and treats', updatedAt: new Date() },
    ];

    const createdCategories: Record<string, any> = {};
    for (const category of sampleCategories) {
        const upsertedCategory = await prisma.categories.upsert({
            where: { slug: category.slug },
            update: category,
            create: category,
        });
        createdCategories[category.slug] = upsertedCategory;
        console.log(`  ✓ ${category.name}`);
    }

    // 6. Create sample products
    console.log('\n🛒 Creating sample products...');
    const sampleProducts = [
        // Vegetables
        {
            name: 'Fresh Spinach',
            slug: 'fresh-spinach',
            description: 'Fresh green spinach leaves, perfect for soups and stews',
            price: 8.99,
            stock: 50,
            unit: 'bunch',
            weight: 0.5,
            categoryId: createdCategories['vegetables'].id,
            imageUrl: 'https://placehold.co/600x600/ff6b35/ffffff?text=Jollof+Rice',
            isFeatured: true,
            status: 'ACTIVE',
        },
        {
            name: 'Dried Okra',
            slug: 'dried-okra',
            description: 'Sun-dried okra for traditional dishes',
            price: 12.50,
            stock: 30,
            unit: 'lb',
            weight: 1.0,
            categoryId: createdCategories['vegetables'].id,
            imageUrl: 'https://placehold.co/600x600/4ecdc4/ffffff?text=Egusi+Soup',
            isFeatured: false,
            status: 'ACTIVE',
        },
        // Grains & Legumes
        {
            name: 'Long Grain Rice (5lb)',
            slug: 'long-grain-rice-5lb',
            description: 'Premium long grain rice, perfect for jollof and fried rice',
            price: 15.99,
            stock: 100,
            unit: 'bag',
            weight: 5.0,
            categoryId: createdCategories['grains'].id,
            imageUrl: 'https://placehold.co/600x600/95e1d3/000000?text=Pounded+Yam',
            isFeatured: true,
            status: 'ACTIVE',
        },
        {
            name: 'Black-Eyed Peas (2lb)',
            slug: 'black-eyed-peas-2lb',
            description: 'High-quality black-eyed peas for traditional bean dishes',
            price: 9.99,
            stock: 75,
            unit: 'bag',
            weight: 2.0,
            categoryId: createdCategories['grains'].id,
            imageUrl: 'https://placehold.co/600x600/f38181/ffffff?text=Suya+Sticks',
            isFeatured: false,
            status: 'ACTIVE',
        },
        // Spices & Seasonings
        {
            name: 'Ground Crayfish',
            slug: 'ground-crayfish',
            description: 'Authentic ground crayfish for traditional seasoning',
            price: 18.50,
            stock: 40,
            unit: 'oz',
            weight: 0.75,
            categoryId: createdCategories['spices'].id,
            imageUrl: 'https://placehold.co/600x600/aa96da/ffffff?text=Moi+Moi',
            isFeatured: true,
            status: 'ACTIVE',
        },
        {
            name: 'Curry Powder Blend',
            slug: 'curry-powder-blend',
            description: 'Traditional curry powder blend with authentic spices',
            price: 10.99,
            stock: 60,
            unit: 'oz',
            weight: 0.5,
            categoryId: createdCategories['spices'].id,
            imageUrl: 'https://placehold.co/600x600/fcbad3/000000?text=Plantain+Chips',
            isFeatured: false,
            status: 'ACTIVE',
        },
        // Oils & Condiments
        {
            name: 'Palm Oil (32oz)',
            slug: 'palm-oil-32oz',
            description: 'Pure red palm oil for authentic African cooking',
            price: 22.99,
            stock: 45,
            unit: 'bottle',
            weight: 2.0,
            categoryId: createdCategories['oils'].id,
            imageUrl: 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5',
            isFeatured: true,
            status: 'ACTIVE',
        },
        {
            name: 'Groundnut Oil (1L)',
            slug: 'groundnut-oil-1l',
            description: 'Pure groundnut (peanut) oil for frying and cooking',
            price: 16.50,
            stock: 55,
            unit: 'bottle',
            weight: 2.2,
            categoryId: createdCategories['oils'].id,
            imageUrl: 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5',
            isFeatured: false,
            status: 'ACTIVE',
        },
        // Snacks
        {
            name: 'Plantain Chips',
            slug: 'plantain-chips',
            description: 'Crispy fried plantain chips, lightly salted',
            price: 7.99,
            stock: 80,
            unit: 'bag',
            weight: 0.5,
            categoryId: createdCategories['snacks'].id,
            imageUrl: 'https://placehold.co/600x600/e74c3c/ffffff?text=Zobo+Drink',
            isFeatured: true,
            status: 'ACTIVE',
        },
        {
            name: 'Chin Chin',
            slug: 'chin-chin',
            description: 'Traditional crunchy fried dough snack',
            price: 9.50,
            stock: 65,
            unit: 'bag',
            weight: 0.75,
            categoryId: createdCategories['snacks'].id,
            imageUrl: 'https://placehold.co/600x600/d4a373/000000?text=Palm+Wine',
            isFeatured: false,
            status: 'ACTIVE',
        },
    ];

    let productsCreated = 0;
    for (const product of sampleProducts) {
        const existing = await prisma.products.findUnique({
            where: { slug: product.slug },
        });

        if (!existing) {
            await prisma.products.create({
                data: {
                    id: crypto.randomUUID(),
                    name: product.name,
                    slug: product.slug,
                    description: product.description,
                    price: product.price,
                    stock: product.stock,
                    unit: product.unit,
                    weight: product.weight,
                    categoryId: product.categoryId,
                    images: product.imageUrl ? [product.imageUrl] : [],
                    status: product.status as ProductStatus,
                    updatedAt: new Date(),
                },
            });
            productsCreated++;
            console.log(`  ✓ ${product.name}`);
        } else {
            console.log(`  ⊙ ${product.name} (already exists)`);
        }
    }

    console.log('\n📊 Final Summary:');
    const categoryCount = await prisma.categories.count();
    const productCount = await prisma.products.count();
    console.log(`  • Categories: ${categoryCount}`);
    console.log(`  • Products: ${productCount}`);
    console.log(`  • New products added: ${productsCreated}`);

    console.log('\n✅ Database seed completed successfully!\n');
}

main()
    .catch((e) => {
        console.error('❌ Error seeding database:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
