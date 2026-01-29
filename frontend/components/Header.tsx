'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useTheme } from './ThemeProvider';
import { useAuth } from './AuthProvider';
import { useCart } from '@/contexts/CartContext';
import { useToast } from './ui/toast';
import Image from 'next/image';
import { useState, useEffect, useRef } from 'react';
import { api } from '@/lib/api';
import { Product } from '@/lib/types';

export function Header() {
    const pathname = usePathname();
    const router = useRouter();
    const { mode, toggleMode } = useTheme();
    const { user, logout } = useAuth();
    const { itemCount } = useCart();
    const { showToast } = useToast();
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<Product[]>([]);
    const [showSearchDropdown, setShowSearchDropdown] = useState(false);
    const [showUserMenu, setShowUserMenu] = useState(false);
    const [isSearching, setIsSearching] = useState(false);
    const searchRef = useRef<HTMLDivElement>(null);
    const userMenuRef = useRef<HTMLDivElement>(null);

    const isActive = (path: string) => pathname === path;

    const handleLogout = () => {
        logout();
        showToast('You have been logged out successfully', 'info');
        setShowUserMenu(false);
        router.push('/');
    };

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
            if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
                setShowUserMenu(false);
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
                                    href="/kitchen-refill"
                                    className={`hover:text-primary transition-colors flex items-center gap-1 ${isActive('/kitchen-refill') ? 'text-primary font-semibold' : 'text-foreground'
                                        }`}
                                >
                                    <span>🔄</span> Kitchen Refill
                                </Link>
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
                            {itemCount > 0 && (
                                <span className="absolute -top-1 -right-1 bg-primary text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center animate-in zoom-in-50 duration-200">
                                    {itemCount}
                                </span>
                            )}
                        </Link>

                        {user ? (
                            <div className="relative" ref={userMenuRef}>
                                <button
                                    onClick={() => setShowUserMenu(!showUserMenu)}
                                    className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-muted transition-colors"
                                >
                                    <div className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center font-bold">
                                        {(user.fullName || user.email).charAt(0).toUpperCase()}
                                    </div>
                                    <span className="text-sm font-medium hidden md:block">
                                        {user.fullName || user.email.split('@')[0]}
                                    </span>
                                    <span className="text-xs">▼</span>
                                </button>

                                {showUserMenu && (
                                    <div className="absolute right-0 mt-2 w-56 bg-background border border-border rounded-lg shadow-lg py-2 animate-in slide-in-from-top-2 duration-200">
                                        <div className="px-4 py-2 border-b border-border">
                                            <p className="text-sm font-medium">{user.fullName || 'User'}</p>
                                            <p className="text-xs text-muted-foreground">{user.email}</p>
                                        </div>
                                        <Link
                                            href="/profile"
                                            className="block px-4 py-2 text-sm hover:bg-muted transition-colors"
                                            onClick={() => setShowUserMenu(false)}
                                        >
                                            👤 My Profile
                                        </Link>
                                        <Link
                                            href="/orders"
                                            className="block px-4 py-2 text-sm hover:bg-muted transition-colors"
                                            onClick={() => setShowUserMenu(false)}
                                        >
                                            📦 My Orders
                                        </Link>
                                        <Link
                                            href="/refill"
                                            className="block px-4 py-2 text-sm hover:bg-muted transition-colors"
                                            onClick={() => setShowUserMenu(false)}
                                        >
                                            🔄 Kitchen Refill
                                        </Link>
                                        <hr className="my-2 border-border" />
                                        <button
                                            onClick={handleLogout}
                                            className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-950 transition-colors"
                                        >
                                            🚪 Logout
                                        </button>
                                    </div>
                                )}
                            </div>
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
