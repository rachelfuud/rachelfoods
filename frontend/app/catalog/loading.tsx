import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Skeleton, ProductGridSkeleton } from '@/components/ui/SkeletonLoader';

export default function CatalogLoading() {
    return (
        <div className="min-h-screen flex flex-col">
            <Header />

            <main className="flex-1 container mx-auto px-4 py-8">
                <div className="mb-8">
                    <Skeleton className="h-10 w-64 mb-4" />
                    <Skeleton className="h-6 w-96" />
                </div>

                {/* Categories skeleton */}
                <div className="mb-8">
                    <Skeleton className="h-8 w-32 mb-4" />
                    <div className="flex flex-wrap gap-3">
                        {[1, 2, 3, 4, 5].map((i) => (
                            <Skeleton key={i} className="h-10 w-32" />
                        ))}
                    </div>
                </div>

                {/* Products grid skeleton */}
                <ProductGridSkeleton count={8} />
            </main>

            <Footer />
        </div>
    );
}
