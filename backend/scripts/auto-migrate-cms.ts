import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

export async function runCmsMigration() {
    try {
        console.log('🔍 Checking if CMS tables exist...');

        // Check if site_config table exists
        const tableExists = await prisma.$queryRaw<any[]>`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'site_config'
      );
    `;

        if (tableExists[0]?.exists) {
            console.log('✅ CMS tables already exist. Skipping migration.');
            return;
        }

        console.log('🚀 Running CMS tables migration...');

        // Read the SQL file
        const sqlFilePath = path.join(__dirname, '../prisma/migrations/manual_add_cms_tables.sql');
        const sql = fs.readFileSync(sqlFilePath, 'utf-8');

        // Execute the entire SQL as one transaction
        await prisma.$executeRawUnsafe(sql);

        console.log('✅ CMS tables migration completed successfully!');
        console.log('\n📦 Created tables:');
        console.log('  - site_config (header, footer, announcement configuration)');
        console.log('  - content_pages (custom pages like About Us, FAQ, etc.)');
        console.log('  - content_sections (reusable page sections)');
        console.log('  - media_assets (media library)');
        console.log('\n🌱 Default configurations seeded:');
        console.log('  - Header: Logo, navigation menu, announcement bar');
        console.log('  - Footer: Columns, social links, copyright');
    } catch (error: any) {
        if (error.message?.includes('already exists')) {
            console.log('✅ CMS tables already exist. Skipping migration.');
            return;
        }
        console.error('❌ Migration failed:', error.message);
        throw error;
    } finally {
        await prisma.$disconnect();
    }
}

// Run if called directly
if (require.main === module) {
    runCmsMigration()
        .then(() => {
            console.log('✅ Migration complete!');
            process.exit(0);
        })
        .catch((error) => {
            console.error('❌ Migration failed:', error);
            process.exit(1);
        });
}
