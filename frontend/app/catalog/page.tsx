import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { ProductGrid } from '@/components/ProductGrid';
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
                                className={`px-4 py-2 rounded-lg border transition-colors ${!params.category
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
                                    className={`px-4 py-2 rounded-lg border transition-colors ${params.category === category.slug
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
                        className={`px-4 py-2 rounded-lg border transition-colors ${params.featured === 'true'
                            ? 'bg-secondary text-white border-secondary'
                            : 'border-border hover:border-secondary'
                            }`}
                    >
                        ⭐ Featured Only
                    </Link>
                </div>

                {/* Products Grid */}
                <ProductGrid products={products} />
            </main>

            <Footer />
        </div>
    );
}
