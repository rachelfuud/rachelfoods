import { PrismaClient } from '@prisma/client';

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

        // Execute each statement individually - Prisma doesn't support multi-statement queries
        await prisma.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS site_config (id VARCHAR(255) PRIMARY KEY, type VARCHAR(50) UNIQUE NOT NULL, config JSONB NOT NULL, "isActive" BOOLEAN NOT NULL DEFAULT true, "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedBy" VARCHAR(255))`);
        await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS idx_site_config_type ON site_config(type)`);

        await prisma.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS content_pages (id VARCHAR(255) PRIMARY KEY, slug VARCHAR(255) UNIQUE NOT NULL, title VARCHAR(500) NOT NULL, "metaTitle" VARCHAR(500), "metaDesc" TEXT, "ogImage" TEXT, "isPublished" BOOLEAN NOT NULL DEFAULT false, "publishedAt" TIMESTAMP(3), "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "createdBy" VARCHAR(255), "updatedBy" VARCHAR(255))`);
        await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS idx_content_pages_slug ON content_pages(slug)`);
        await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS idx_content_pages_published ON content_pages("isPublished")`);

        await prisma.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS content_sections (id VARCHAR(255) PRIMARY KEY, "pageId" VARCHAR(255) NOT NULL, type VARCHAR(50) NOT NULL, title VARCHAR(500), "order" INTEGER NOT NULL DEFAULT 0, "isVisible" BOOLEAN NOT NULL DEFAULT true, settings JSONB NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT fk_content_sections_page FOREIGN KEY ("pageId") REFERENCES content_pages(id) ON DELETE CASCADE)`);
        await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS idx_content_sections_pageId ON content_sections("pageId")`);
        await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS idx_content_sections_order ON content_sections("order")`);
        await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS idx_content_sections_type ON content_sections(type)`);

        await prisma.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS media_assets (id VARCHAR(255) PRIMARY KEY, filename VARCHAR(500) NOT NULL, "originalName" VARCHAR(500) NOT NULL, url TEXT NOT NULL, "mimeType" VARCHAR(100) NOT NULL, size INTEGER NOT NULL, width INTEGER, height INTEGER, alt VARCHAR(500), folder VARCHAR(100) NOT NULL DEFAULT 'general', "uploadedBy" VARCHAR(255) NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP)`);
        await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS idx_media_assets_folder ON media_assets(folder)`);
        await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS idx_media_assets_mimeType ON media_assets("mimeType")`);
        await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS idx_media_assets_uploadedBy ON media_assets("uploadedBy")`);

        await prisma.$executeRawUnsafe(`INSERT INTO site_config (id, type, config, "isActive", "updatedAt") VALUES (gen_random_uuid()::text, 'header', '{"logo":{"url":"/logo.png","alt":"RachelFoods"},"navigation":[{"label":"Home","href":"/","order":1},{"label":"Products","href":"/catalog","order":2},{"label":"About","href":"/about","order":3},{"label":"Contact","href":"/contact","order":4}],"announcement":{"enabled":false,"text":"Welcome to RachelFoods!","link":"/catalog","backgroundColor":"#10b981","textColor":"#ffffff"}}'::jsonb, true, CURRENT_TIMESTAMP) ON CONFLICT (type) DO NOTHING`);
        await prisma.$executeRawUnsafe(`INSERT INTO site_config (id, type, config, "isActive", "updatedAt") VALUES (gen_random_uuid()::text, 'footer', '{"columns":[{"title":"Quick Links","links":[{"label":"Home","href":"/"},{"label":"Products","href":"/catalog"},{"label":"About Us","href":"/about"}]},{"title":"Support","links":[{"label":"FAQ","href":"/faq"},{"label":"Contact","href":"/contact"},{"label":"Shipping","href":"/shipping"}]},{"title":"Company","links":[{"label":"Terms of Service","href":"/terms"},{"label":"Privacy Policy","href":"/privacy"}]}],"social":{"facebook":"https://facebook.com/rachelfoods","twitter":"https://twitter.com/rachelfoods","instagram":"https://instagram.com/rachelfoods","linkedin":"https://linkedin.com/company/rachelfoods"},"copyright":"© 2026 RachelFoods. All rights reserved.","paymentIcons":{"enabled":true,"icons":["visa","mastercard","paypal","stripe"]}}'::jsonb, true, CURRENT_TIMESTAMP) ON CONFLICT (type) DO NOTHING`);

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
