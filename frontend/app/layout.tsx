import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/ThemeProvider";
import { AuthProvider } from "@/components/AuthProvider";
import { CartProvider } from "@/contexts/CartContext";
import { ToastProvider } from "@/components/ui/toast";
import { PageTransitionLoader } from "@/components/ui/page-transition-loader";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "RachelFoods - Human-Assisted Food Commerce",
  description: "Food commerce platform with seller confirmation workflow",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
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
      </body>
    </html>
  );
}
