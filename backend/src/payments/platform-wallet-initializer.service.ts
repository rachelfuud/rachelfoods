import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { WalletService } from './wallet.service';
import { PrismaService } from '../prisma/prisma.service';
import { WalletType } from '@prisma/client';

/**
 * Platform wallet configuration
 */
interface PlatformWalletConfig {
    walletCode: string;
    walletType: WalletType;
    description: string;
}

/**
 * PlatformWalletInitializer
 * 
 * Ensures platform-level wallets exist on application bootstrap.
 * 
 * DESIGN PRINCIPLES:
 * 1. Idempotent: Safe to run multiple times (checks existence before creation)
 * 2. Environment-safe: No duplicate wallets in any environment
 * 3. Bootstrap-integrated: Executes automatically via OnModuleInit
 * 4. No side effects: Only creates wallet records, no ledger entries
 * 5. Clear logging: Distinguishes between "already exists" and "newly created"
 * 
 * PLATFORM WALLETS:
 * 
 * 1. PLATFORM_MAIN (WalletType.PLATFORM)
 *    - Primary platform wallet for fee collection
 *    - Receives platform fees from all transactions
 *    - Used for refunds if refundPlatformFee = true
 *    - MUST exist before first payment capture
 * 
 * 2. PLATFORM_ESCROW (WalletType.ESCROW)
 *    - Reserved for future escrow functionality
 *    - Not currently used in payment flows
 *    - Created for schema consistency
 * 
 * CRITICAL CONSTRAINTS:
 * - Platform wallets MUST have userId = null
 * - Platform wallets MUST use unique walletCode
 * - NO balance field (balance computed from ledger)
 * - NO ledger entries created during initialization
 * 
 * EXECUTION:
 * - Runs automatically on NestJS module initialization
 * - Can also be triggered manually via initializePlatformWallets()
 * - Errors logged but don't crash application
 * 
 * NOT RESPONSIBLE FOR:
 * - Creating ledger entries
 * - Setting initial balances
 * - Payment processing
 * - User wallet creation
 */
@Injectable()
export class PlatformWalletInitializer implements OnModuleInit {
    private readonly logger = new Logger(PlatformWalletInitializer.name);

    /**
     * Platform wallets to initialize
     */
    private readonly PLATFORM_WALLETS: PlatformWalletConfig[] = [
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

    constructor(
        private readonly walletService: WalletService,
        private readonly prisma: PrismaService,
    ) { }

    /**
     * NestJS lifecycle hook - runs on module initialization
     * 
     * This ensures platform wallets exist before any payments are processed.
     */
    async onModuleInit() {
        this.logger.log('Initializing platform wallets...');
        await this.initializePlatformWallets();
    }

    /**
     * Initialize all platform wallets
     * 
     * IDEMPOTENT: Safe to call multiple times
     * - Checks if wallet exists before creating
     * - Skips creation if wallet already exists
     * - Logs clear messages for each wallet
     * 
     * @returns Summary of initialization results
     */
    async initializePlatformWallets() {
        const results = {
            created: [] as string[],
            alreadyExists: [] as string[],
            failed: [] as { walletCode: string; error: string }[],
        };

        for (const config of this.PLATFORM_WALLETS) {
            try {
                await this.ensureWalletExists(config, results);
            } catch (error) {
                this.logger.error(
                    `Failed to initialize wallet ${config.walletCode}: ${error.message}`,
                    error.stack,
                );
                results.failed.push({
                    walletCode: config.walletCode,
                    error: error.message,
                });
            }
        }

        // Log summary
        this.logInitializationSummary(results);

        return results;
    }

    /**
     * Ensure a platform wallet exists
     * 
     * IDEMPOTENT LOGIC:
     * 1. Check if wallet exists by walletCode (unique constraint)
     * 2. If exists: log and skip
     * 3. If not exists: create via WalletService
     * 
     * @param config Platform wallet configuration
     * @param results Accumulator for tracking results
     */
    private async ensureWalletExists(
        config: PlatformWalletConfig,
        results: {
            created: string[];
            alreadyExists: string[];
            failed: { walletCode: string; error: string }[];
        },
    ) {
        // Check if wallet already exists
        const existingWallet = await this.prisma.wallets.findUnique({
            where: { walletCode: config.walletCode },
        });

        if (existingWallet) {
            this.logger.log(
                `✓ Platform wallet ${config.walletCode} already exists (ID: ${existingWallet.id})`,
            );
            results.alreadyExists.push(config.walletCode);
            return;
        }

        // Create wallet based on type
        let wallet;
        if (config.walletType === WalletType.PLATFORM) {
            wallet = await this.walletService.createPlatformWallet(config.walletCode);
        } else if (config.walletType === WalletType.ESCROW) {
            wallet = await this.walletService.createEscrowWallet(config.walletCode);
        } else {
            throw new Error(`Unsupported wallet type: ${config.walletType}`);
        }

        this.logger.log(
            `✓ Created platform wallet ${config.walletCode} (ID: ${wallet.id}) - ${config.description}`,
        );
        results.created.push(config.walletCode);
    }

    /**
     * Log initialization summary
     * 
     * Provides clear visibility into what happened during initialization.
     * 
     * @param results Initialization results
     */
    private logInitializationSummary(results: {
        created: string[];
        alreadyExists: string[];
        failed: { walletCode: string; error: string }[];
    }) {
        const total = this.PLATFORM_WALLETS.length;
        const created = results.created.length;
        const existing = results.alreadyExists.length;
        const failed = results.failed.length;

        this.logger.log('='.repeat(60));
        this.logger.log('Platform Wallet Initialization Summary');
        this.logger.log('='.repeat(60));
        this.logger.log(`Total wallets configured: ${total}`);
        this.logger.log(`Newly created: ${created}`);
        this.logger.log(`Already existed: ${existing}`);
        this.logger.log(`Failed: ${failed}`);

        if (created > 0) {
            this.logger.log(`\nCreated wallets: ${results.created.join(', ')}`);
        }

        if (existing > 0) {
            this.logger.log(`\nExisting wallets: ${results.alreadyExists.join(', ')}`);
        }

        if (failed > 0) {
            this.logger.error(`\nFailed wallets:`);
            results.failed.forEach((f) => {
                this.logger.error(`  - ${f.walletCode}: ${f.error}`);
            });
        }

        this.logger.log('='.repeat(60));

        // Log overall status
        if (failed === 0) {
            this.logger.log('✅ All platform wallets are ready');
        } else {
            this.logger.warn(
                `⚠️ Some platform wallets failed to initialize (${failed}/${total})`,
            );
        }
    }

    /**
     * Verify all platform wallets exist
     * 
     * Useful for health checks or manual verification.
     * 
     * @returns Object mapping walletCode to wallet existence status
     */
    async verifyPlatformWallets() {
        const verification: Record<string, boolean> = {};

        for (const config of this.PLATFORM_WALLETS) {
            const wallet = await this.prisma.wallets.findUnique({
                where: { walletCode: config.walletCode },
            });
            verification[config.walletCode] = wallet !== null;
        }

        return verification;
    }

    /**
     * Get all platform wallets with current balances
     * 
     * Useful for admin dashboards or financial reporting.
     * 
     * @returns Array of platform wallets with computed balances
     */
    async getPlatformWalletsStatus() {
        const wallets = [];

        for (const config of this.PLATFORM_WALLETS) {
            try {
                const wallet = await this.prisma.wallets.findUnique({
                    where: { walletCode: config.walletCode },
                });

                if (wallet) {
                    const balance = await this.walletService.getWalletBalance(wallet.id);
                    wallets.push({
                        walletCode: config.walletCode,
                        walletType: config.walletType,
                        description: config.description,
                        id: wallet.id,
                        status: wallet.walletStatus,
                        balance,
                        currency: wallet.currency,
                        createdAt: wallet.createdAt,
                    });
                } else {
                    wallets.push({
                        walletCode: config.walletCode,
                        walletType: config.walletType,
                        description: config.description,
                        exists: false,
                        error: 'Wallet not found',
                    });
                }
            } catch (error) {
                wallets.push({
                    walletCode: config.walletCode,
                    walletType: config.walletType,
                    description: config.description,
                    exists: false,
                    error: error.message,
                });
            }
        }

        return wallets;
    }

    /**
     * Manually trigger platform wallet initialization
     * 
     * Can be called from a seed script or admin command.
     * 
     * @returns Initialization results
     */
    async seed() {
        this.logger.log('Manual platform wallet seeding triggered');
        return await this.initializePlatformWallets();
    }
}
