import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { api } from '@/lib/api';
import { Product } from '@/lib/types';
import { ProductDetailClient } from '@/components/ProductDetailClient';
import Image from 'next/image';
import Link from 'next/link';
import type { Metadata } from 'next';

export async function generateMetadata({
    params,
}: {
    params: Promise<{ slug: string }>;
}): Promise<Metadata> {
    const { slug } = await params;

    try {
        const product = await api.getProduct(slug);

        if (!product || product.status !== 'ACTIVE') {
            return {
                title: 'Product Not Found',
                description: 'The product you are looking for does not exist.',
            };
        }

        const productUrl = `${process.env.NEXT_PUBLIC_SITE_URL || 'https://rachelfoods.com'}/products/${product.slug}`;
        const imageUrl = product.imageUrl || `${process.env.NEXT_PUBLIC_SITE_URL || 'https://rachelfoods.com'}/og-default.jpg`;

        return {
            title: `${product.name} | RachelFoods`,
            description: product.description || `Buy ${product.name} - Authentic traditional food products delivered fresh to your door.`,
            openGraph: {
                type: 'website',
                url: productUrl,
                title: product.name,
                description: product.description || `Buy ${product.name} online`,
                images: [
                    {
                        url: imageUrl,
                        width: 1200,
                        height: 630,
                        alt: product.name,
                    },
                ],
                siteName: 'RachelFoods',
            },
            twitter: {
                card: 'summary_large_image',
                title: product.name,
                description: product.description || `Buy ${product.name} online`,
                images: [imageUrl],
                creator: '@rachelfoods',
            },
            alternates: {
                canonical: productUrl,
            },
            keywords: [
                product.name,
                product.category?.name || 'food',
                'traditional food',
                'authentic',
                'RachelFoods',
            ],
        };
    } catch (error) {
        return {
            title: 'Product Not Found',
            description: 'The product you are looking for does not exist.',
        };
    }
}

export default async function ProductPage({
    params,
}: {
    params: Promise<{ slug: string }>;
}) {
    // Next.js 15+: params is now a Promise
    const { slug } = await params;

    let product: Product | null = null;
    let errorOccurred = false;

    console.log('[ProductPage] Fetching product with slug:', slug);

    try {
        product = await api.getProduct(slug);
        console.log('[ProductPage] Product fetched successfully:', product?.name);
        console.log('[ProductPage] Product has variants:', product?.variants?.length || 0);

        // Buyers should not see DRAFT, DISABLED, or ARCHIVED products
        // Only ACTIVE products are visible to public buyers
        // (Admin users should use admin panel to view non-active products)
        if (product && product.status && product.status !== 'ACTIVE') {
            console.log('[ProductPage] Product status is not ACTIVE:', product.status);
            product = null;
        }
    } catch (error) {
        console.error('[ProductPage] Failed to load product:', error);
        errorOccurred = true;
    }

    if (!product || errorOccurred) {
        return (
            <div className="min-h-screen flex flex-col">
                <Header />
                <main className="flex-1 container mx-auto px-4 py-16 text-center">
                    <h1 className="text-4xl font-bold mb-4">Product Not Found</h1>
                    <p className="text-foreground/70 mb-8">The product you're looking for doesn't exist.</p>
                    <Link
                        href="/catalog"
                        className="inline-block px-6 py-3 bg-primary text-white rounded-lg hover:opacity-90 transition-opacity"
                    >
                        Back to Catalog
                    </Link>
                </main>
                <Footer />
            </div>
        );
    }

    const hasDiscount = product.compareAtPrice && product.compareAtPrice > product.price;
    const discountPercent = hasDiscount
        ? Math.round(((product.compareAtPrice! - product.price) / product.compareAtPrice!) * 100)
        : 0;

    return (
        <div className="min-h-screen flex flex-col">
            <Header />

            <main className="flex-1 container mx-auto px-4 py-8">
                <nav className="mb-6 text-sm">
                    <Link href="/catalog" className="text-primary hover:underline">Catalog</Link>
                    {product.category && (
                        <>
                            <span className="mx-2 text-foreground/50">/</span>
                            <Link href={`/catalog?category=${product.category.slug}`} className="text-primary hover:underline">
                                {product.category.name}
                            </Link>
                        </>
                    )}
                    <span className="mx-2 text-foreground/50">/</span>
                    <span className="text-foreground/70">{product.name}</span>
                </nav>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                    {/* Product Image */}
                    <div>
                        {product.imageUrl ? (
                            <div className="relative aspect-square rounded-lg overflow-hidden bg-muted">
                                <Image
                                    src={product.imageUrl}
                                    alt={product.name}
                                    fill
                                    className="object-cover"
                                />
                                {hasDiscount && (
                                    <div className="absolute top-4 right-4 bg-accent text-white px-4 py-2 rounded-lg text-lg font-bold">
                                        -{discountPercent}% OFF
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="aspect-square rounded-lg bg-muted flex items-center justify-center">
                                <span className="text-9xl">🍽️</span>
                            </div>
                        )}
                    </div>

                    {/* Product Info - Client Component */}
                    <div>
                        <ProductDetailClient product={product} />
                    </div>
                </div>
            </main>

            <Footer />
        </div>
    );
}
