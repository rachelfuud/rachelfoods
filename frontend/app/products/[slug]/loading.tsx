export default function ProductsLoading() {
    return (
        <div className="min-h-screen flex items-center justify-center">
            <div className="text-center">
                <div className="inline-block animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-primary"></div>
                <p className="mt-4 text-lg text-foreground/70">Loading product...</p>
            </div>
        </div>
    );
}
