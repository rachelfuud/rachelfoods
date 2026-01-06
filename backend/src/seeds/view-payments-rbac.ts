import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * View Payments & Refunds RBAC Configuration
 * 
 * This script displays the current RBAC configuration for Payments & Refunds domain.
 * Shows all permissions and which roles have them assigned.
 * 
 * USAGE:
 * npm run view:payments-rbac
 * 
 * OR:
 * npx ts-node src/seeds/view-payments-rbac.ts
 */

async function main() {
    console.log('\n📊 Payments & Refunds RBAC Configuration\n');
    console.log('='.repeat(70));

    // Get all payment/refund related permissions
    const resources = ['payment', 'refund', 'ledger', 'wallet'];
    const permissions = await prisma.permissions.findMany({
        where: {
            resource: { in: resources },
        },
        orderBy: [{ resource: 'asc' }, { action: 'asc' }],
        include: {
            role_permissions: {
                include: {
                    roles: true,
                },
            },
        },
    });

    console.log('\n🔐 PERMISSIONS & ROLE ASSIGNMENTS\n');

    let currentResource = '';
    for (const permission of permissions) {
        if (permission.resource !== currentResource) {
            currentResource = permission.resource;
            console.log(`\n${currentResource.toUpperCase()}`);
            console.log('-'.repeat(70));
        }

        const permissionKey = `${permission.resource}.${permission.action}`;
        const roles = permission.role_permissions
            .map((rp) => rp.roles.name)
            .join(', ');

        console.log(`  ${permissionKey.padEnd(30)} → ${roles || 'Not assigned'}`);
    }

    // Get role-based view
    console.log('\n\n📋 ROLE-BASED VIEW\n');

    const roles = await prisma.roles.findMany({
        where: {
            slug: { in: ['buyer', 'store-owner', 'delivery-agent', 'platform-admin'] },
        },
        orderBy: { name: 'asc' },
        include: {
            role_permissions: {
                include: {
                    permissions: true,
                },
                where: {
                    permissions: {
                        resource: { in: resources },
                    },
                },
            },
        },
    });

    for (const role of roles) {
        console.log(`\n${role.name} (${role.slug})`);
        console.log('-'.repeat(70));

        if (role.role_permissions.length === 0) {
            console.log('  (No Payments & Refunds permissions)');
        } else {
            const permissionsByResource: Record<string, string[]> = {};

            for (const rp of role.role_permissions) {
                const resource = rp.permissions.resource;
                if (!permissionsByResource[resource]) {
                    permissionsByResource[resource] = [];
                }
                permissionsByResource[resource].push(
                    `${rp.permissions.resource}.${rp.permissions.action}`
                );
            }

            for (const [resource, perms] of Object.entries(permissionsByResource)) {
                console.log(`  ${resource.toUpperCase()}:`);
                perms.forEach((p) => console.log(`    • ${p}`));
            }
        }
    }

    // Statistics
    console.log('\n\n📈 STATISTICS\n');
    console.log('-'.repeat(70));

    const totalPermissions = permissions.length;
    const totalAssignments = permissions.reduce(
        (sum, p) => sum + p.role_permissions.length,
        0
    );

    console.log(`  Total Permissions (Payment/Refund/Ledger/Wallet): ${totalPermissions}`);
    console.log(`  Total Role-Permission Assignments:                ${totalAssignments}`);

    // Breakdown by resource
    const byResource: Record<string, number> = {};
    for (const permission of permissions) {
        byResource[permission.resource] = (byResource[permission.resource] || 0) + 1;
    }

    console.log('\n  Permissions by Resource:');
    for (const [resource, count] of Object.entries(byResource)) {
        console.log(`    • ${resource.padEnd(15)}: ${count}`);
    }

    console.log('\n' + '='.repeat(70) + '\n');
}

main()
    .catch((e) => {
        console.error('❌ Error viewing RBAC configuration:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
