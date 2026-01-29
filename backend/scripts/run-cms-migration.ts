import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

async function runCmsMigration() {
    try {
        console.log('🚀 Running CMS tables migration...');

        // Read the SQL file
        const sqlFilePath = path.join(__dirname, '../prisma/migrations/manual_add_cms_tables.sql');
        const sql = fs.readFileSync(sqlFilePath, 'utf-8');

        // Split by semicolons and execute each statement
        const statements = sql
            .split(';')
            .map(s => s.trim())
            .filter(s => s.length > 0 && !s.startsWith('--'));

        for (const statement of statements) {
            if (statement) {
                await prisma.$executeRawUnsafe(statement);
                console.log('✅ Executed statement');
            }
        }

        console.log('✅ CMS tables migration completed successfully!');
        console.log('\nCreated tables:');
        console.log('  - site_config (header, footer, announcement configuration)');
        console.log('  - content_pages (custom pages like About Us, FAQ, etc.)');
        console.log('  - content_sections (reusable page sections)');
        console.log('  - media_assets (media library)');
        console.log('\nDefault configurations seeded:');
        console.log('  - Header: Logo, navigation menu, announcement bar');
        console.log('  - Footer: Columns, social links, copyright');
    } catch (error) {
        console.error('❌ Migration failed:', error);
        throw error;
    } finally {
        await prisma.$disconnect();
    }
}

runCmsMigration();
