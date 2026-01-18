import Link from 'next/link';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { PaymentIcons } from '@/components/PaymentIcons';
import { ProductCard } from '@/components/ProductCard';
import { RefillHero } from '@/components/RefillHero';
import { api } from '@/lib/api';
import { Product } from '@/lib/types';
import Image from 'next/image';

export default async function Home() {
  // Fetch featured, popular, and all products with comprehensive fallback
  let featuredProducts: Product[] = [];
  let popularProducts: Product[] = [];
  let newArrivals: Product[] = [];

  try {
    // Fetch all product types in parallel
    const [featured, popular, all] = await Promise.all([
      api.getFeaturedProducts().catch(() => []),
      api.getPopularProducts().catch(() => []),
      api.getProducts().catch(() => [])
    ]);

    featuredProducts = featured;
    popularProducts = popular;

    // Get new arrivals (latest ACTIVE products) sorted by createdAt
    newArrivals = all
      .filter((p: Product) => !p.status || p.status === 'ACTIVE')
      .sort((a: Product, b: Product) => {
        // Fallback sorting if no createdAt
        return 0;
      })
      .slice(0, 6);
  } catch (error) {
    console.error('Failed to load products:', error);
  }

  // Ensure home page ALWAYS shows products
  const hasAnyProducts = featuredProducts.length > 0 || popularProducts.length > 0 || newArrivals.length > 0;
  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1">
        {/* Hero Section */}
        <section className="bg-linear-to-br from-primary-50 via-secondary-50 to-accent-50 dark:from-primary-950 dark:via-secondary-950 dark:to-accent-950 py-24">
          <div className="container mx-auto px-4">
            <div className="flex flex-col md:flex-row items-center justify-between gap-12">
              <div className="flex-1 text-center md:text-left">
                <h1 className="text-5xl md:text-7xl font-extrabold mb-6 leading-tight">
                  Authentic Traditional Foods,{' '}
                  <span className="bg-linear-to-r from-primary-600 to-secondary-600 dark:from-primary-400 dark:to-secondary-400 bg-clip-text text-transparent">
                    Delivered Across the U.S.
                  </span>
                </h1>
                <p className="text-xl md:text-2xl text-text-secondary mb-10 max-w-2xl leading-relaxed">
                  Fresh, dry, and ready-to-cook essentials — shop once or refill anytime.
                  Every order confirmed by our sellers for guaranteed freshness and availability.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center md:justify-start mb-10">
                  <Link
                    href="/catalog"
                    className="px-10 py-5 bg-linear-to-r from-primary-600 to-primary-700 dark:from-primary-500 dark:to-primary-600 text-white rounded-2xl font-bold hover:shadow-2xl hover:scale-105 transition-all duration-300 text-lg"
                  >
                    Shop Products
                  </Link>
                  <Link
                    href="#refill"
                    className="px-10 py-5 border-3 border-primary-600 dark:border-primary-500 text-primary-700 dark:text-primary-400 rounded-2xl font-bold hover:bg-primary-50 dark:hover:bg-primary-950 transition-all duration-300 text-lg"
                  >
                    How Refill Works
                  </Link>
                </div>
                <PaymentIcons />
              </div>

              <div className="flex-1 flex justify-center">
                <div className="relative w-72 h-72 md:w-md md:h-112 rounded-full bg-linear-to-br from-brand-accent/20 to-brand-primary/20 p-8 shadow-2xl">
                  <Image
                    src="/logo.png"
                    alt="RachelFoods"
                    fill
                    className="object-contain drop-shadow-2xl"
                  />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Quick Product Preview - Compact Grid */}
        {newArrivals.length > 0 && (
          <section className="py-16 bg-background">
            <div className="container mx-auto px-4">
              <div className="text-center mb-8">
                <h2 className="text-3xl font-bold mb-2">Shop Our Products</h2>
                <p className="text-text-secondary">Fresh ingredients and authentic flavors</p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                {newArrivals.slice(0, 4).map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
              <div className="text-center">
                <Link
                  href="/catalog"
                  className="inline-flex items-center gap-2 px-6 py-3 border-2 border-primary-500 text-primary-600 dark:text-primary-400 rounded-lg font-semibold hover:bg-primary-50 dark:hover:bg-primary-950 transition-all"
                >
                  <span>View All Products</span>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
              </div>
            </div>
          </section>
        )}

        {/* Refill Your Kitchen Section - ALWAYS VISIBLE */}
        <RefillHero />

        {/* Featured Products Section - Priority 1 */}
        {featuredProducts.length > 0 ? (
          <section className="py-24 bg-linear-to-b from-background to-brand-muted/30 dark:from-background dark:to-surface">
            <div className="container mx-auto px-4">
              <div className="text-center mb-16">
                <div className="inline-flex items-center gap-2 px-6 py-3 bg-linear-to-r from-secondary-100 to-secondary-200 dark:from-secondary-900/30 dark:to-secondary-800/20 rounded-full mb-6">
                  <span className="text-2xl">⭐</span>
                  <span className="font-bold text-secondary-700 dark:text-secondary-400">Handpicked for You</span>
                </div>
                <h2 className="text-5xl md:text-6xl font-bold mb-6 bg-linear-to-r from-primary-600 to-secondary-600 dark:from-primary-400 dark:to-secondary-400 bg-clip-text text-transparent">
                  Featured Products
                </h2>
                <p className="text-xl text-text-secondary max-w-2xl mx-auto">
                  Discover our handpicked selection of traditional foods and authentic ingredients
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 mb-12">
                {featuredProducts.slice(0, 6).map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>

              <div className="text-center">
                <Link
                  href="/catalog"
                  className="inline-flex items-center gap-3 px-10 py-5 bg-linear-to-r from-primary-600 to-primary-700 dark:from-primary-500 dark:to-primary-600 text-white rounded-2xl font-bold hover:shadow-2xl hover:scale-105 transition-all duration-300"
                >
                  <span>View All Products</span>
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </Link>
              </div>
            </div>
          </section>
        ) : popularProducts.length > 0 ? (
          <>
            {/* Fallback to Popular if no Featured */}
            <section className="py-24 bg-linear-to-b from-background to-brand-muted/30 dark:from-background dark:to-surface">
              <div className="container mx-auto px-4">
                <div className="text-center mb-16">
                  <div className="inline-flex items-center gap-2 px-6 py-3 bg-linear-to-r from-accent-100 to-accent-200 dark:from-accent-900/30 dark:to-accent-800/20 rounded-full mb-6">
                    <span className="text-2xl">🔥</span>
                    <span className="font-bold text-accent-700 dark:text-accent-400">Trending Now</span>
                  </div>
                  <h2 className="text-5xl md:text-6xl font-bold mb-6 bg-linear-to-r from-accent-600 to-primary-600 dark:from-accent-400 dark:to-primary-400 bg-clip-text text-transparent">
                    Popular Products
                  </h2>
                  <p className="text-xl text-text-secondary max-w-2xl mx-auto">
                    See what others are ordering — our most popular products this week
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 mb-12">
                  {popularProducts.slice(0, 6).map((product) => (
                    <ProductCard key={product.id} product={product} />
                  ))}
                </div>

                <div className="text-center">
                  <Link
                    href="/catalog"
                    className="inline-flex items-center gap-3 px-10 py-5 bg-linear-to-r from-accent-600 to-accent-700 dark:from-accent-500 dark:to-accent-600 text-white rounded-2xl font-bold hover:shadow-2xl hover:scale-105 transition-all duration-300"
                  >
                    <span>View All Products</span>
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                  </Link>
                </div>
              </div>
            </section>
          </>
        ) : newArrivals.length > 0 ? (
          <>
            {/* Final Fallback to New Arrivals */}
            <section className="py-24 bg-linear-to-b from-background to-brand-muted/30 dark:from-background dark:to-surface">
              <div className="container mx-auto px-4">
                <div className="text-center mb-16">
                  <div className="inline-flex items-center gap-2 px-6 py-3 bg-linear-to-r from-primary-100 to-primary-200 dark:from-primary-900/30 dark:to-primary-800/20 rounded-full mb-6">
                    <span className="text-2xl">✨</span>
                    <span className="font-bold text-primary-700 dark:text-primary-400">Just Added</span>
                  </div>
                  <h2 className="text-5xl md:text-6xl font-bold mb-6 bg-linear-to-r from-primary-600 to-secondary-600 dark:from-primary-400 dark:to-secondary-400 bg-clip-text text-transparent">
                    New Arrivals
                  </h2>
                  <p className="text-xl text-text-secondary max-w-2xl mx-auto">
                    Browse our latest additions to the catalog
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 mb-12">
                  {newArrivals.map((product) => (
                    <ProductCard key={product.id} product={product} />
                  ))}
                </div>

                <div className="text-center">
                  <Link
                    href="/catalog"
                    className="inline-flex items-center gap-3 px-10 py-5 bg-linear-to-r from-primary-600 to-secondary-600 dark:from-primary-500 dark:to-secondary-500 text-white rounded-2xl font-bold hover:shadow-2xl hover:scale-105 transition-all duration-300"
                  >
                    <span>View All Products</span>
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                  </Link>
                </div>
              </div>
            </section>
          </>
        ) : null}

        {/* CTA Section */}
        <section className="py-24 bg-linear-to-r from-primary-600 via-secondary-600 to-accent-600 dark:from-primary-700 dark:via-secondary-700 dark:to-accent-700 text-white">
          <div className="container mx-auto px-4 text-center">
            <h2 className="text-5xl md:text-6xl font-bold mb-8">Ready to Get Started?</h2>
            <p className="text-xl md:text-2xl mb-12 max-w-3xl mx-auto opacity-95 leading-relaxed">
              Browse our catalog of authentic traditional foods and experience
              hassle-free shopping with seller confirmation.
            </p>
            <Link
              href="/catalog"
              className="inline-flex items-center gap-3 px-12 py-6 bg-white text-primary-700 rounded-2xl font-bold hover:shadow-2xl hover:scale-105 transition-all duration-300 text-xl"
            >
              <span>Explore Catalog</span>
              <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </Link>
          </div>
        </section>
      </main>

      <Footer />
    </div >
  );
}
