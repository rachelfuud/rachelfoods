'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useTheme } from './ThemeProvider';
import { useAuth } from './AuthProvider';
import Image from 'next/image';
import { useState, useEffect, useRef } from 'react';
import { api } from '@/lib/api';
import { Product } from '@/lib/types';

export function Header() {
    const pathname = usePathname();
    const router = useRouter();
    const { mode, toggleMode } = useTheme();
    const { user, logout } = useAuth();
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<Product[]>([]);
    const [showSearchDropdown, setShowSearchDropdown] = useState(false);
    const [isSearching, setIsSearching] = useState(false);
    const searchRef = useRef<HTMLDivElement>(null);

    const isActive = (path: string) => pathname === path;

    // Debounced search
    useEffect(() => {
        if (searchQuery.trim().length < 2) {
            setSearchResults([]);
            setShowSearchDropdown(false);
            return;
        }

        setIsSearching(true);
        const timeoutId = setTimeout(async () => {
            try {
                const results = await api.searchProducts(searchQuery);
                setSearchResults(results.slice(0, 5)); // Limit to 5 suggestions
                setShowSearchDropdown(true);
            } catch (error) {
                console.error('Search failed:', error);
                setSearchResults([]);
            } finally {
                setIsSearching(false);
            }
        }, 300);

        return () => clearTimeout(timeoutId);
    }, [searchQuery]);

    // Close dropdown on outside click
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
                setShowSearchDropdown(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleProductClick = (slug: string) => {
        setSearchQuery('');
        setShowSearchDropdown(false);
        router.push(`/products/${slug}`);
    };

    return (
        <header className="border-b border-border bg-background sticky top-0 z-50">
            <nav className="container mx-auto px-4 py-4">
                <div className="flex items-center justify-between">
                    <Link href="/" className="flex items-center gap-2">
                        <Image
                            src="/logo.png"
                            alt="RachelFoods Logo"
                            width={40}
                            height={40}
                            className="rounded"
                        />
                        <span className="text-xl font-bold text-primary">RachelFoods</span>
                    </Link>

                    <div className="hidden md:flex items-center gap-6 flex-1 max-w-xl mx-8">
                        <div className="relative w-full" ref={searchRef}>
                            <input
                                type="text"
                                placeholder="Search products..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary bg-background"
                            />
                            {isSearching && (
                                <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                                    <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                                </div>
                            )}
                            {showSearchDropdown && searchResults.length > 0 && (
                                <div className="absolute top-full mt-2 w-full bg-background border border-border rounded-lg shadow-lg z-50">
                                    {searchResults.map((product) => (
                                        <button
                                            key={product.id}
                                            onClick={() => handleProductClick(product.slug)}
                                            className="w-full px-4 py-3 text-left hover:bg-muted transition-colors border-b border-border last:border-b-0"
                                        >
                                            <div className="font-semibold">{product.name}</div>
                                            <div className="text-sm text-foreground/70">
                                                ${product.price.toFixed(2)} / {product.unit}
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="hidden md:flex items-center gap-6">
                        <Link
                            href="/"
                            className={`hover:text-primary transition-colors ${isActive('/') ? 'text-primary font-semibold' : 'text-foreground'
                                }`}
                        >
                            Home
                        </Link>
                        <Link
                            href="/catalog"
                            className={`hover:text-primary transition-colors ${isActive('/catalog') ? 'text-primary font-semibold' : 'text-foreground'
                                }`}
                        >
                            Catalog
                        </Link>
                        {user && (
                            <>
                                <Link
                                    href="/orders"
                                    className={`hover:text-primary transition-colors ${isActive('/orders') ? 'text-primary font-semibold' : 'text-foreground'
                                        }`}
                                >
                                    Orders
                                </Link>
                                <Link
                                    href="/profile"
                                    className={`hover:text-primary transition-colors ${isActive('/profile') ? 'text-primary font-semibold' : 'text-foreground'
                                        }`}
                                >
                                    Profile
                                </Link>
                            </>
                        )}
                    </div>

                    <div className="flex items-center gap-4">
                        <button
                            onClick={toggleMode}
                            className="p-2 rounded-lg hover:bg-muted transition-colors"
                            aria-label="Toggle theme"
                        >
                            {mode === 'light' ? '🌙' : '☀️'}
                        </button>

                        <Link
                            href="/cart"
                            className="relative p-2 rounded-lg hover:bg-muted transition-colors"
                        >
                            🛒
                        </Link>

                        {user ? (
                            <>
                                <span className="text-sm text-foreground/70">Welcome, {user.fullName || user.email}</span>
                                <button
                                    onClick={logout}
                                    className="px-4 py-2 border border-primary text-primary rounded-lg hover:bg-primary hover:text-white transition-all"
                                >
                                    Logout
                                </button>
                            </>
                        ) : (
                            <>
                                <Link
                                    href="/register"
                                    className="px-4 py-2 border border-primary text-primary rounded-lg hover:bg-primary hover:text-white transition-all"
                                >
                                    Register
                                </Link>

                                <Link
                                    href="/login"
                                    className="px-4 py-2 bg-primary text-white rounded-lg hover:opacity-90 transition-opacity"
                                >
                                    Login
                                </Link>
                            </>
                        )}
                    </div>
                </div>
            </nav>
        </header>
    );
}
