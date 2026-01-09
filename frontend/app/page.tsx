import Link from 'next/link';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { PaymentIcons } from '@/components/PaymentIcons';
import { ProductCard } from '@/components/ProductCard';
import { api } from '@/lib/api';
import { Product } from '@/lib/types';
import Image from 'next/image';

export default async function Home() {
  // Fetch products for featured section
  let products: Product[] = [];
  try {
    products = await api.getProducts();
  } catch (error) {
    console.error('Failed to load products:', error);
  }

  // Get first 6 products as featured
  const featuredProducts = products.slice(0, 6);
  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1">
        {/* Hero Section */}
        <section className="bg-gradient-to-br from-primary/10 via-secondary/10 to-accent/10 py-20">
          <div className="container mx-auto px-4">
            <div className="flex flex-col md:flex-row items-center justify-between gap-12">
              <div className="flex-1 text-center md:text-left">
                <h1 className="text-5xl md:text-6xl font-bold mb-6 leading-tight">
                  Authentic Nigerian Food,{' '}
                  <span className="text-primary">Delivered Fresh</span>
                </h1>
                <p className="text-xl text-foreground/70 mb-8 max-w-2xl">
                  Premium quality traditional ingredients and ready mixes.
                  Every order confirmed by our sellers for guaranteed freshness and availability.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center md:justify-start mb-8">
                  <Link
                    href="/catalog"
                    className="px-8 py-4 bg-primary text-white rounded-lg font-semibold hover:opacity-90 transition-opacity text-lg"
                  >
                    Shop Now
                  </Link>
                  <Link
                    href="/catalog"
                    className="px-8 py-4 border-2 border-primary text-primary rounded-lg font-semibold hover:bg-primary/5 transition-colors text-lg"
                  >
                    Browse Categories
                  </Link>
                </div>
                <PaymentIcons />
              </div>

              <div className="flex-1 flex justify-center">
                <div className="relative w-64 h-64 md:w-96 md:h-96">
                  <Image
                    src="/logo.png"
                    alt="RachelFoods"
                    fill
                    className="object-contain"
                  />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Featured Products Section */}
        {featuredProducts.length > 0 && (
          <section className="py-20 bg-background">
            <div className="container mx-auto px-4">
              <div className="text-center mb-12">
                <h2 className="text-4xl font-bold mb-4">Popular Products</h2>
                <p className="text-xl text-foreground/70 max-w-2xl mx-auto">
                  Discover our most loved traditional Nigerian foods and ingredients
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                {featuredProducts.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>

              <div className="text-center">
                <Link
                  href="/catalog"
                  className="inline-block px-8 py-4 bg-primary text-white rounded-lg font-semibold hover:opacity-90 transition-opacity"
                >
                  View All Products
                </Link>
              </div>
            </div>
          </section>
        )}

        {/* Refill Feature Section */}
        <section className="py-20 bg-muted">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto text-center">
              <div className="text-6xl mb-6">🔄</div>
              <h2 className="text-4xl font-bold mb-6">Never Run Out of Your Favorites</h2>
              <p className="text-xl text-foreground/70 mb-8">
                Love a product? Reorder with just one click. Our easy refill feature
                lets you repurchase your favorite items instantly, saving you time
                and ensuring you never run out of essential ingredients.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-background p-6 rounded-lg border border-border">
                  <div className="text-3xl mb-3">🛒</div>
                  <h3 className="font-semibold mb-2">One-Click Reorder</h3>
                  <p className="text-sm text-foreground/70">
                    Instantly add previous orders to your cart
                  </p>
                </div>
                <div className="bg-background p-6 rounded-lg border border-border">
                  <div className="text-3xl mb-3">📦</div>
                  <h3 className="font-semibold mb-2">Order History</h3>
                  <p className="text-sm text-foreground/70">
                    Track all your purchases and repeat favorites
                  </p>
                </div>
                <div className="bg-background p-6 rounded-lg border border-border">
                  <div className="text-3xl mb-3">⚡</div>
                  <h3 className="font-semibold mb-2">Fast Checkout</h3>
                  <p className="text-sm text-foreground/70">
                    Skip the browsing, get what you need quickly
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="py-20 bg-background">
          <div className="container mx-auto px-4">
            <h2 className="text-4xl font-bold text-center mb-12">Why Choose RachelFoods?</h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="bg-muted p-8 rounded-lg border border-border">
                <div className="text-5xl mb-4">✅</div>
                <h3 className="text-2xl font-bold mb-4 text-primary">Seller Confirmed</h3>
                <p className="text-foreground/70">
                  Every order is reviewed and confirmed by the seller before payment.
                  No surprises, guaranteed availability.
                </p>
              </div>

              <div className="bg-muted p-8 rounded-lg border border-border">
                <div className="text-5xl mb-4">🌾</div>
                <h3 className="text-2xl font-bold mb-4 text-secondary">Authentic Quality</h3>
                <p className="text-foreground/70">
                  Traditional Nigerian ingredients sourced from trusted suppliers.
                  Fresh, authentic, and true to taste.
                </p>
              </div>

              <div className="bg-muted p-8 rounded-lg border border-border">
                <div className="text-5xl mb-4">🚚</div>
                <h3 className="text-2xl font-bold mb-4 text-accent">Fast Delivery</h3>
                <p className="text-foreground/70">
                  Professional delivery ensures your food arrives fresh and on time.
                  Track your order every step of the way.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-20 bg-primary text-white">
          <div className="container mx-auto px-4 text-center">
            <h2 className="text-4xl font-bold mb-6">Ready to Get Started?</h2>
            <p className="text-xl mb-8 max-w-2xl mx-auto opacity-90">
              Browse our catalog of authentic Nigerian foods and experience
              hassle-free shopping with seller confirmation.
            </p>
            <Link
              href="/catalog"
              className="inline-block px-8 py-4 bg-white text-primary rounded-lg font-semibold hover:bg-gray-100 transition-colors text-lg"
            >
              Explore Catalog
            </Link>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
