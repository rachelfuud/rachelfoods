import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Product emoji/image mappings for placeholders
const productImageMap: Record<string, string> = {
    'ofada-rice': 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=400&h=400&fit=crop',
    'white-rice': 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=400&h=400&fit=crop',
    'fufu': 'https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?w=400&h=400&fit=crop',
    'tapioca': 'https://images.unsplash.com/photo-1518977676601-b53f82aba655?w=400&h=400&fit=crop',
    'ogi': 'https://images.unsplash.com/photo-1525351484163-7529414344d8?w=400&h=400&fit=crop',
    'fresh-ogi': 'https://images.unsplash.com/photo-1525351484163-7529414344d8?w=400&h=400&fit=crop',
    'cat-fish': 'https://images.unsplash.com/photo-1534043464124-3be32fe000c9?w=400&h=400&fit=crop',
    'panla': 'https://images.unsplash.com/photo-1534043464124-3be32fe000c9?w=400&h=400&fit=crop',
    'pomo': 'https://images.unsplash.com/photo-1588347818036-8986240fec62?w=400&h=400&fit=crop',
    'kilishi': 'https://images.unsplash.com/photo-1603048297172-c92544798d5a?w=400&h=400&fit=crop',
    'cray-fish': 'https://images.unsplash.com/photo-1534043464124-3be32fe000c9?w=400&h=400&fit=crop',
    'egusi': 'https://images.unsplash.com/photo-1597362925123-77861d3fbac7?w=400&h=400&fit=crop',
    'iru-locust-beans': 'https://images.unsplash.com/photo-1599939625738-45d4a1b63280?w=400&h=400&fit=crop',
    'pepper-soup-ingredient': 'https://images.unsplash.com/photo-1599939625738-45d4a1b63280?w=400&h=400&fit=crop',
    'ayamase-mix': 'https://images.unsplash.com/photo-1621510456681-2330135e5871?w=400&h=400&fit=crop',
    'ofada-mix': 'https://images.unsplash.com/photo-1621510456681-2330135e5871?w=400&h=400&fit=crop',
    'ewa-aganyin-mix': 'https://images.unsplash.com/photo-1621510456681-2330135e5871?w=400&h=400&fit=crop',
};

// Default fallback image
const DEFAULT_IMAGE = 'https://images.unsplash.com/photo-1606787366850-de6330128bfc?w=400&h=400&fit=crop';

async function updateProductImages() {
    try {
        const products = await prisma.products.findMany({
            select: {
                id: true,
                name: true,
                slug: true,
                imageUrl: true,
            },
        });

        console.log(`Found ${products.length} products to update`);

        for (const product of products) {
            const newImageUrl = productImageMap[product.slug] || DEFAULT_IMAGE;

            await prisma.products.update({
                where: { id: product.id },
                data: { imageUrl: newImageUrl },
            });

            console.log(`✅ Updated "${product.name}" with image: ${newImageUrl}`);
        }

        console.log('\n🎉 All product images updated successfully!');
        console.log('\nImages are now using high-quality Unsplash placeholders.');
    } catch (error) {
        console.error('❌ Error updating product images:', error);
        throw error;
    } finally {
        await prisma.$disconnect();
    }
}

updateProductImages();
