export function Footer() {
    return (
        <footer className="border-t border-border bg-muted mt-auto">
            <div className="container mx-auto px-4 py-8">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                    <div>
                        <h3 className="font-bold text-lg mb-4 text-primary">RachelFoods</h3>
                        <p className="text-sm text-foreground/70">
                            Human-assisted food commerce platform with seller confirmation workflow
                        </p>
                    </div>

                    <div>
                        <h4 className="font-semibold mb-4">Shop</h4>
                        <ul className="space-y-2 text-sm">
                            <li><a href="/catalog" className="hover:text-primary transition-colors">All Products</a></li>
                            <li><a href="/catalog?featured=true" className="hover:text-primary transition-colors">Featured</a></li>
                        </ul>
                    </div>

                    <div>
                        <h4 className="font-semibold mb-4">Account</h4>
                        <ul className="space-y-2 text-sm">
                            <li><a href="/orders" className="hover:text-primary transition-colors">My Orders</a></li>
                            <li><a href="/profile" className="hover:text-primary transition-colors">Profile</a></li>
                        </ul>
                    </div>

                    <div>
                        <h4 className="font-semibold mb-4">Support</h4>
                        <ul className="space-y-2 text-sm">
                            <li><a href="/help" className="hover:text-primary transition-colors">Help Center</a></li>
                            <li><a href="/contact" className="hover:text-primary transition-colors">Contact Us</a></li>
                        </ul>
                    </div>
                </div>

                <div className="mt-8 pt-8 border-t border-border text-center text-sm text-foreground/60">
                    <p>&copy; 2026 RachelFoods. All rights reserved.</p>
                </div>
            </div>
        </footer>
    );
}
