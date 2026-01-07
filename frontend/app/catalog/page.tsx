import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { ProductCard } from '@/components/ProductCard';
import { api } from '@/lib/api';
import { Product, Category } from '@/lib/types';
import Link from 'next/link';

export default async function CatalogPage({
    searchParams,
}: {
    searchParams: Promise<{ category?: string; featured?: string }>;
}) {
    // Await searchParams in Next.js 16
    const params = await searchParams;

    // Fetch categories and products from backend
    let categories: Category[] = [];
    let products: Product[] = [];

    try {
        categories = await api.getCategories();
        products = await api.getProducts(params.category);

        if (params.featured === 'true') {
            products = products.filter((p: Product) => p.isFeatured);
        }
    } catch (error) {
        console.error('Failed to load catalog:', error);
    }

    return (
        <div className="min-h-screen flex flex-col">
            <Header />

            <main className="flex-1 container mx-auto px-4 py-8">
                <div className="mb-8">
                    <h1 className="text-4xl font-bold mb-4">Product Catalog</h1>
                    <p className="text-foreground/70">
                        Browse our selection of fresh food products
                    </p>
                </div>

                {/* Categories */}
                {categories.length > 0 && (
                    <div className="mb-8">
                        <h2 className="text-2xl font-bold mb-4">Categories</h2>
                        <div className="flex flex-wrap gap-3">
                            <Link
                                href="/catalog"
                                className={`px-4 py-2 rounded-lg border transition-colors ${!searchParams.category
                                    ? 'bg-primary text-white border-primary'
                                    : 'border-border hover:border-primary'
                                    }`}
                            >
                                All Products
                            </Link>
                            {categories.map((category: Category) => (
                                <Link
                                    key={category.id}
                                    href={`/catalog?category=${category.slug}`}
                                    className={`px-4 py-2 rounded-lg border transition-colors ${searchParams.category === category.slug
                                        ? 'bg-primary text-white border-primary'
                                        : 'border-border hover:border-primary'
                                        }`}
                                >
                                    {category.name}
                                </Link>
                            ))}
                        </div>
                    </div>
                )}

                {/* Filters */}
                <div className="mb-8 flex gap-4">
                    <Link
                        href="/catalog?featured=true"
                        className={`px-4 py-2 rounded-lg border transition-colors ${searchParams.featured === 'true'
                            ? 'bg-secondary text-white border-secondary'
                            : 'border-border hover:border-secondary'
                            }`}
                    >
                        ⭐ Featured Only
                    </Link>
                </div>

                {/* Products Grid */}
                {products.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {products.map((product: Product) => (
                            <ProductCard key={product.id} product={product} />
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-20">
                        <div className="text-6xl mb-4">🍽️</div>
                        <h3 className="text-2xl font-bold mb-2">No products found</h3>
                        <p className="text-foreground/70 mb-6">
                            {searchParams.category
                                ? 'No products in this category yet'
                                : 'Products will be displayed here once added by the seller'}
                        </p>
                        <Link
                            href="/catalog"
                            className="inline-block px-6 py-3 bg-primary text-white rounded-lg hover:opacity-90 transition-opacity"
                        >
                            View All Products
                        </Link>
                    </div>
                )}
            </main>

            <Footer />
        </div>
    );
}
