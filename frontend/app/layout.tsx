import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/ThemeProvider";
import { AuthProvider } from "@/components/AuthProvider";
import { CartProvider } from "@/contexts/CartContext";
import { ToastProvider } from "@/components/ui/toast";
import { PageTransitionLoader } from "@/components/ui/page-transition-loader";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { QueryClientProvider } from "@/components/QueryClientProvider";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "RachelFoods - Traditional Food Delivery & Kitchen Refill",
  description: "Order authentic traditional foods with kitchen refill feature - pre-order weekly, monthly or for special events. Seller-confirmed orders with custom delivery scheduling.",
    ],
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: "#16a34a",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#16a34a" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
      </head>
      <body className={inter.className}>
        <ErrorBoundary>
          <QueryClientProvider>
            <ToastProvider>
              <AuthProvider>
                <ThemeProvider>
                  <CartProvider>
                    <PageTransitionLoader />
                    {children}
                  </CartProvider>
                </ThemeProvider>
              </AuthProvider>
            </ToastProvider>
          </QueryClientProvider>
        </ErrorBoundary>
      </body>
    </html>
  );
}
