import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * RBAC Permissions Seed for Payments & Refunds Domain
 * 
 * This script seeds permissions and role mappings for:
 * - Payments (create, capture, cancel, read)
 * - Refunds (create, approve, reject, process, read)
 * - Ledger (read-only access)
 * - Wallets (read-only access)
 * 
 * IDEMPOTENT: Safe to run multiple times
 * - Uses upsert for permissions
 * - Checks for existing role-permission assignments
 * 
 * USAGE:
 * npm run seed:payments-rbac
 * 
 * OR:
 * npx ts-node src/seeds/seed-payments-rbac.ts
 */

// Define permissions for Payments & Refunds domain
const paymentsPermissions = [
    // Payment permissions
    {
        action: 'create',
        resource: 'payment',
        description: 'Create payment records (initiate payment)',
    },
    {
        action: 'read_self',
        resource: 'payment',
        description: 'View own payment records',
    },
    {
        action: 'read_any',
        resource: 'payment',
        description: 'View any payment records (admin only)',
    },
    {
        action: 'capture',
        resource: 'payment',
        description: 'Capture payment (confirm funds received, COD for agents)',
    },
    {
        action: 'cancel',
        resource: 'payment',
        description: 'Cancel payment before capture',
    },

    // Refund permissions
    {
        action: 'create',
        resource: 'refund',
        description: 'Create refund requests (buyers)',
    },
    {
        action: 'read_self',
        resource: 'refund',
        description: 'View own refund records',
    },
    {
        action: 'read_any',
        resource: 'refund',
        description: 'View any refund records (admin only)',
    },
    {
        action: 'approve',
        resource: 'refund',
        description: 'Approve refund requests (admin only)',
    },
    {
        action: 'reject',
        resource: 'refund',
        description: 'Reject refund requests (admin only)',
    },
    {
        action: 'process',
        resource: 'refund',
        description: 'Process approved refunds (admin only)',
    },

    // Ledger permissions (read-only)
    {
        action: 'read_self',
        resource: 'ledger',
        description: 'View own ledger entries (transaction history)',
    },
    {
        action: 'read_any',
        resource: 'ledger',
        description: 'View any ledger entries (admin audit)',
    },

    // Wallet permissions (read-only)
    {
        action: 'read_self',
        resource: 'wallet',
        description: 'View own wallet balance and statement',
    },
    {
        action: 'read_any',
        resource: 'wallet',
        description: 'View any wallet balance and statement (admin only)',
    },
];

// Role-Permission mapping for Payments & Refunds
// Maps role slugs to permission keys (resource.action format)
const paymentsrole_permissionss: Record<string, string[]> = {
    // BUYER: Can create payments, request refunds, view own financial data
    buyer: [
        'payment.create',
        'payment.read_self',
        'refund.create',
        'refund.read_self',
        'wallet.read_self',
        'ledger.read_self',
    ],

    // STORE_OWNER (SELLER): Can view payments related to their sales, view own financial data
    'store-owner': [
        'payment.read_self',
        'refund.read_self',
        'wallet.read_self',
        'ledger.read_self',
    ],

    // DELIVERY_AGENT: Can capture COD payments (enforcement at controller/service level)
    'delivery-agent': [
        'payment.capture', // COD confirmation only
        'payment.read_self',
    ],

    // PLATFORM_ADMIN: Full access to all financial operations
    'platform-admin': [
        'payment.create',
        'payment.read_self',
        'payment.read_any',
        'payment.capture',
        'payment.cancel',
        'refund.create',
        'refund.read_self',
        'refund.read_any',
        'refund.approve',
        'refund.reject',
        'refund.process',
        'ledger.read_self',
        'ledger.read_any',
        'wallet.read_self',
        'wallet.read_any',
    ],
};

async function main() {
    console.log('🌱 Starting Payments & Refunds RBAC seed...\n');

    // Statistics
    let permissionsCreated = 0;
    let permissionsExisted = 0;
    let assignmentsCreated = 0;
    let assignmentsExisted = 0;

    // 1. Create or update permissions
    console.log('🔐 Creating Payments & Refunds permissions...\n');
    const createdPermissions: Record<string, any> = {};

    for (const permission of paymentsPermissions) {
        const key = `${permission.resource}.${permission.action}`;

        // Check if permission already exists
        const existing = await prisma.permissions.findUnique({
            where: {
                action_resource: {
                    action: permission.action,
                    resource: permission.resource,
                },
            },
        });

        if (existing) {
            console.log(`  ✓ ${key} (already exists)`);
            createdPermissions[key] = existing;
            permissionsExisted++;
        } else {
            const created = await prisma.permissions.create({
                data: permission,
            });
            console.log(`  ✓ ${key} (created)`);
            createdPermissions[key] = created;
            permissionsCreated++;
        }
    }

    // 2. Load existing roles
    console.log('\n📋 Loading roles...\n');
    const roles = await prisma.roles.findMany({
        where: {
            slug: {
                in: Object.keys(paymentsrole_permissionss),
            },
        },
    });

    const roleMap: Record<string, any> = {};
    for (const role of roles) {
        roleMap[role.slug] = role;
        console.log(`  ✓ Found role: ${role.name} (${role.slug})`);
    }

    // 3. Assign permissions to roles
    console.log('\n🔗 Assigning Payments & Refunds permissions to roles...\n');

    for (const [roleSlug, permissionKeys] of Object.entries(
        paymentsrole_permissionss
    )) {
        const role = roleMap[roleSlug];
        if (!role) {
            console.warn(`  ⚠️  Role '${roleSlug}' not found, skipping...`);
            continue;
        }

        console.log(`  ${role.name}:`);

        for (const permissionKey of permissionKeys) {
            const permission = createdPermissions[permissionKey];
            if (!permission) {
                console.warn(`    ⚠️  Permission '${permissionKey}' not found, skipping...`);
                continue;
            }

            // Check if already assigned
            const existing = await prisma.role_permissions.findFirst({
                where: {
                    roleId: role.id,
                    permissionId: permission.id,
                },
            });

            if (existing) {
                console.log(`    ✓ ${permissionKey} (already assigned)`);
                assignmentsExisted++;
            } else {
                await prisma.role_permissions.create({
                    data: {
                        roleId: role.id,
                        permissionId: permission.id,
                    },
                });
                console.log(`    ✓ ${permissionKey} (assigned)`);
                assignmentsCreated++;
            }
        }

        console.log('');
    }

    // 4. Summary
    console.log('='.repeat(60));
    console.log('Payments & Refunds RBAC Seed Summary');
    console.log('='.repeat(60));
    console.log(`Permissions:`);
    console.log(`  • Created: ${permissionsCreated}`);
    console.log(`  • Already existed: ${permissionsExisted}`);
    console.log(`  • Total: ${permissionsCreated + permissionsExisted}`);
    console.log('');
    console.log(`Role-Permission Assignments:`);
    console.log(`  • Created: ${assignmentsCreated}`);
    console.log(`  • Already existed: ${assignmentsExisted}`);
    console.log(`  • Total: ${assignmentsCreated + assignmentsExisted}`);
    console.log('='.repeat(60));

    if (permissionsCreated > 0 || assignmentsCreated > 0) {
        console.log('\n✅ Payments & Refunds RBAC seed completed successfully!');
        console.log(`   ${permissionsCreated} new permissions and ${assignmentsCreated} new assignments created.`);
    } else {
        console.log('\n✅ All Payments & Refunds permissions already exist.');
        console.log('   No changes were made.');
    }

    console.log('');
}

main()
    .catch((e) => {
        console.error('❌ Error seeding Payments & Refunds RBAC:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
