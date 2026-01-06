import Link from 'next/link';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import Image from 'next/image';

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1">
        {/* Hero Section */}
        <section className="bg-gradient-to-br from-primary/10 via-secondary/10 to-accent/10 py-20">
          <div className="container mx-auto px-4">
            <div className="flex flex-col md:flex-row items-center justify-between gap-12">
              <div className="flex-1 text-center md:text-left">
                <h1 className="text-5xl md:text-6xl font-bold mb-6">
                  Fresh Food,{' '}
                  <span className="text-primary">Delivered</span>
                </h1>
                <p className="text-xl text-foreground/70 mb-8 max-w-2xl">
                  Experience human-assisted food commerce with seller confirmation workflow.
                  Quality guaranteed, every time.
                </p>
                <div className="flex gap-4 justify-center md:justify-start">
                  <Link
                    href="/catalog"
                    className="px-8 py-4 bg-primary text-white rounded-lg font-semibold hover:opacity-90 transition-opacity"
                  >
                    Shop Now
                  </Link>
                  <Link
                    href="/catalog?featured=true"
                    className="px-8 py-4 border-2 border-primary text-primary rounded-lg font-semibold hover:bg-primary/5 transition-colors"
                  >
                    View Featured
                  </Link>
                </div>
              </div>

              <div className="flex-1 flex justify-center">
                <div className="relative w-64 h-64 md:w-96 md:h-96">
                  <Image
                    src="/assets/logo.png"
                    alt="RachelFoods"
                    fill
                    className="object-contain"
                  />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="py-20 bg-muted">
          <div className="container mx-auto px-4">
            <h2 className="text-4xl font-bold text-center mb-12">Why Choose RachelFoods?</h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="bg-background p-8 rounded-lg border border-border">
                <div className="text-5xl mb-4">✅</div>
                <h3 className="text-2xl font-bold mb-4 text-primary">Seller Confirmed</h3>
                <p className="text-foreground/70">
                  Every order is confirmed by the seller before payment.
                  No surprises, no uncertainty.
                </p>
              </div>

              <div className="bg-background p-8 rounded-lg border border-border">
                <div className="text-5xl mb-4">🚚</div>
                <h3 className="text-2xl font-bold mb-4 text-secondary">Fast Delivery</h3>
                <p className="text-foreground/70">
                  Professional delivery agents ensure your food arrives fresh and on time.
                </p>
              </div>

              <div className="bg-background p-8 rounded-lg border border-border">
                <div className="text-5xl mb-4">⭐</div>
                <h3 className="text-2xl font-bold mb-4 text-accent">Quality Assured</h3>
                <p className="text-foreground/70">
                  Only the freshest products from trusted sellers. Your satisfaction is guaranteed.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-20">
          <div className="container mx-auto px-4 text-center">
            <h2 className="text-4xl font-bold mb-6">Ready to Get Started?</h2>
            <p className="text-xl text-foreground/70 mb-8 max-w-2xl mx-auto">
              Browse our catalog and experience the future of food commerce.
            </p>
            <Link
              href="/catalog"
              className="inline-block px-8 py-4 bg-primary text-white rounded-lg font-semibold hover:opacity-90 transition-opacity text-lg"
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
