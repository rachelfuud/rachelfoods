import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { api } from '@/lib/api';
import { Product } from '@/lib/types';
import Image from 'next/image';
import Link from 'next/link';

export default async function ProductPage({
    params,
}: {
    params: { slug: string };
}) {
    let product: Product | null = null;

    try {
        product = await api.getProduct(params.slug);
    } catch (error) {
        console.error('Failed to load product:', error);
    }

    if (!product) {
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

                    {/* Product Info */}
                    <div>
                        {product.isFeatured && (
                            <div className="inline-block mb-4 px-3 py-1 bg-secondary/10 text-secondary rounded-full text-sm font-semibold">
                                ⭐ Featured
                            </div>
                        )}

                        <h1 className="text-4xl font-bold mb-4">{product.name}</h1>

                        <div className="flex items-baseline gap-3 mb-6">
                            <span className="text-4xl font-bold text-primary">
                                ${product.price.toFixed(2)}
                            </span>
                            {hasDiscount && (
                                <span className="text-xl text-foreground/50 line-through">
                                    ${product.compareAtPrice!.toFixed(2)}
                                </span>
                            )}
                            <span className="text-lg text-foreground/70">/ {product.unit}</span>
                        </div>

                        <div className="mb-6">
                            <span className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg font-semibold ${product.isAvailable
                                    ? 'bg-green-50 text-green-700 border border-green-200'
                                    : 'bg-red-50 text-red-700 border border-red-200'
                                }`}>
                                {product.isAvailable ? (
                                    <>✓ In Stock ({product.stock} available)</>
                                ) : (
                                    <>✗ Out of Stock</>
                                )}
                            </span>
                        </div>

                        {product.description && (
                            <div className="mb-8">
                                <h2 className="text-xl font-semibold mb-3">Description</h2>
                                <p className="text-foreground/70 leading-relaxed">{product.description}</p>
                            </div>
                        )}

                        {product.isAvailable && (
                            <div className="space-y-4">
                                <button
                                    onClick={() => {
                                        // Add to cart logic
                                        const cart = JSON.parse(localStorage.getItem('cart') || '[]');
                                        const existingItem = cart.find((item: any) => item.productId === product!.id);

                                        if (existingItem) {
                                            existingItem.quantity += 1;
                                        } else {
                                            cart.push({
                                                productId: product!.id,
                                                product: product,
                                                quantity: 1,
                                            });
                                        }

                                        localStorage.setItem('cart', JSON.stringify(cart));
                                        alert('Added to cart!');
                                    }}
                                    className="w-full py-4 bg-primary text-white rounded-lg font-semibold text-lg hover:opacity-90 transition-opacity"
                                >
                                    Add to Cart
                                </button>

                                <Link
                                    href="/cart"
                                    className="block w-full py-4 border-2 border-primary text-primary text-center rounded-lg font-semibold text-lg hover:bg-primary/5 transition-colors"
                                >
                                    View Cart
                                </Link>
                            </div>
                        )}

                        <div className="mt-8 p-6 bg-muted rounded-lg">
                            <h3 className="font-semibold mb-3">🛡️ Quality Guarantee</h3>
                            <p className="text-sm text-foreground/70">
                                All orders are confirmed by the seller before payment.
                                Your satisfaction is our priority.
                            </p>
                        </div>
                    </div>
                </div>
            </main>

            <Footer />
        </div>
    );
}
