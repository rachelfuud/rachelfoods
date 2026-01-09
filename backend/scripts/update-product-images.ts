import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function updateProductImages() {
    const products = await prisma.products.findMany();

    console.log(`Found ${products.length} products to update`);

    for (const product of products) {
        if (!product.images || product.images.length === 0) {
            const imageUrl = `/products/${product.slug}.svg`;
            await prisma.products.update({
                where: { id: product.id },
                data: { images: [imageUrl] }
            });
            console.log(`✅ Updated ${product.name} with image: ${imageUrl}`);
        } else {
            console.log(`⏭️  ${product.name} already has images`);
        }
    }

    console.log('\n🎉 All product images updated!');
}

updateProductImages()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
