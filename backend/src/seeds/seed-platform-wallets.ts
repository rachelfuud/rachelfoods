import { PrismaClient } from '@prisma/client';
import { WalletType, WalletStatus } from '@prisma/client';

/**
 * Platform Wallet Seed Script
 * 
 * This script manually initializes platform wallets using Prisma directly.
 * 
 * USAGE:
 * npm run seed:platform-wallets
 * 
 * OR:
 * npx ts-node src/seeds/seed-platform-wallets.ts
 * 
 * IDEMPOTENT: Safe to run multiple times
 * - Will not create duplicate wallets
 * - Logs whether wallets are newly created or already exist
 * 
 * NOTE: Platform wallets are also initialized automatically on application
 * bootstrap via the PlatformWalletInitializer.onModuleInit() hook.
 * This script is provided for manual seeding or troubleshooting.
 */

interface PlatformWalletConfig {
    walletCode: string;
    walletType: WalletType;
    description: string;
}

const PLATFORM_WALLETS: PlatformWalletConfig[] = [
    {
        walletCode: 'PLATFORM_MAIN',
        walletType: WalletType.PLATFORM,
        description: 'Primary platform wallet for fee collection',
    },
    {
        walletCode: 'PLATFORM_ESCROW',
        walletType: WalletType.ESCROW,
        description: 'Platform escrow wallet for dispute resolution (future use)',
    },
];

async function seedPlatformWallets() {
    console.log('🌱 Starting platform wallet seeding...\n');

    const prisma = new PrismaClient();
    const results = {
        created: [] as string[],
        alreadyExists: [] as string[],
        failed: [] as { walletCode: string; error: string }[],
    };

    try {
        for (const config of PLATFORM_WALLETS) {
            try {
                // Check if wallet already exists
                const existingWallet = await prisma.wallets.findUnique({
                    where: { walletCode: config.walletCode },
                });

                if (existingWallet) {
                    console.log(
                        `✓ Platform wallet ${config.walletCode} already exists (ID: ${existingWallet.id})`
                    );
                    results.alreadyExists.push(config.walletCode);
                    continue;
                }

                // Create wallet
                const wallet = await prisma.wallets.create({
                    data: {
                        userId: null,
                        walletType: config.walletType,
                        walletCode: config.walletCode,
                        walletStatus: WalletStatus.ACTIVE,
                        currency: 'INR',
                    },
                });

                console.log(
                    `✓ Created platform wallet ${config.walletCode} (ID: ${wallet.id}) - ${config.description}`
                );
                results.created.push(config.walletCode);
            } catch (error) {
                console.error(
                    `✗ Failed to initialize wallet ${config.walletCode}: ${error.message}`
                );
                results.failed.push({
                    walletCode: config.walletCode,
                    error: error.message,
                });
            }
        }

        // Log summary
        console.log('\n' + '='.repeat(60));
        console.log('Platform Wallet Initialization Summary');
        console.log('='.repeat(60));
        console.log(`Total wallets configured: ${PLATFORM_WALLETS.length}`);
        console.log(`Newly created: ${results.created.length}`);
        console.log(`Already existed: ${results.alreadyExists.length}`);
        console.log(`Failed: ${results.failed.length}`);

        if (results.created.length > 0) {
            console.log(`\nCreated wallets: ${results.created.join(', ')}`);
        }

        if (results.alreadyExists.length > 0) {
            console.log(`\nExisting wallets: ${results.alreadyExists.join(', ')}`);
        }

        if (results.failed.length > 0) {
            console.error(`\nFailed wallets:`);
            results.failed.forEach((f) => {
                console.error(`  - ${f.walletCode}: ${f.error}`);
            });
        }

        console.log('='.repeat(60));

        if (results.failed.length > 0) {
            console.error('\n❌ Seeding completed with errors');
            process.exit(1);
        } else {
            console.log('\n✅ Seeding completed successfully');
            console.log('✅ All platform wallets are ready\n');
            process.exit(0);
        }
    } catch (error) {
        console.error('\n❌ Fatal error during seeding:', error);
        process.exit(1);
    } finally {
        await prisma.$disconnect();
    }
}

// Run the seed function
seedPlatformWallets();
