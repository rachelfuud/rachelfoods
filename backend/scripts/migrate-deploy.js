#!/usr/bin/env node
/**
 * Railway Deployment Migration Script
 * Handles Prisma migrations with retry logic for advisory lock timeouts
 */

const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

const MAX_RETRIES = 3;
const RETRY_DELAY = 5000; // 5 seconds

async function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function runMigration(attempt = 1) {
    console.log(`\n🔄 Migration attempt ${attempt}/${MAX_RETRIES}...`);

    try {
        const { stdout, stderr } = await execPromise('npx prisma migrate deploy');

        if (stdout) console.log(stdout);
        if (stderr && !stderr.includes('npm notice')) console.error(stderr);

        console.log('✅ Migration completed successfully!');
        return true;
    } catch (error) {
        // Check if it's an advisory lock timeout (P1002)
        if (error.message.includes('P1002') || error.message.includes('advisory lock')) {
            console.warn(`⚠️  Advisory lock timeout on attempt ${attempt}`);

            if (attempt < MAX_RETRIES) {
                console.log(`⏳ Waiting ${RETRY_DELAY / 1000} seconds before retry...`);
                await sleep(RETRY_DELAY);
                return runMigration(attempt + 1);
            } else {
                console.error(`❌ Failed after ${MAX_RETRIES} attempts. Checking migration status...`);

                // Try to get migration status
                try {
                    const { stdout } = await execPromise('npx prisma migrate status');
                    console.log('\n📊 Migration Status:');
                    console.log(stdout);

                    // If no pending migrations, consider it success
                    if (stdout.includes('No pending migrations')) {
                        console.log('✅ No pending migrations - continuing deployment');
                        return true;
                    }
                } catch (statusError) {
                    console.error('Failed to check migration status:', statusError.message);
                }

                throw new Error('Migration failed: Advisory lock timeout');
            }
        } else {
            // Different error - fail immediately
            console.error('❌ Migration failed with error:', error.message);
            throw error;
        }
    }
}

async function main() {
    console.log('🚀 Starting Railway deployment migration...\n');

    try {
        await runMigration();
        console.log('\n✅ Deployment migration completed successfully!');
        process.exit(0);
    } catch (error) {
        console.error('\n❌ Deployment migration failed:', error.message);
        console.error('\n📝 Manual intervention required:');
        console.error('   1. Go to Neon SQL Editor');
        console.error('   2. Run: SELECT pg_advisory_unlock_all();');
        console.error('   3. Redeploy on Railway');
        process.exit(1);
    }
}

main();
