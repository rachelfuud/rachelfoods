// Test theme update via database
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testThemeChange(primaryColor, secondaryColor, accentColor) {
    try {
        const result = await prisma.theme_config.updateMany({
            data: {
                primaryColor,
                secondaryColor,
                accentColor
            }
        });
        console.log('✅ Theme updated successfully!');
        console.log('Primary:', primaryColor);
        console.log('Secondary:', secondaryColor);
        console.log('Accent:', accentColor);
        console.log('\n🔄 Refresh your browser to see changes!');
    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await prisma.$disconnect();
    }
}

// Get colors from command line or use defaults
const primary = process.argv[2] || '#5A080C';
const secondary = process.argv[3] || '#9F541B';
const accent = process.argv[4] || '#c2410c';

testThemeChange(primary, secondary, accent);
