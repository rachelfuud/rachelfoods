'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTheme } from './ThemeProvider';
import Image from 'next/image';

export function Header() {
    const pathname = usePathname();
    const { mode, toggleMode } = useTheme();

    const isActive = (path: string) => pathname === path;

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

                        <Link
                            href="/login"
                            className="px-4 py-2 bg-primary text-white rounded-lg hover:opacity-90 transition-opacity"
                        >
                            Login
                        </Link>
                    </div>
                </div>
            </nav>
        </header>
    );
}
