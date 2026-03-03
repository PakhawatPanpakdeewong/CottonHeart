import type { Metadata } from "next";
import "./globals.css";
import { CartProvider } from "@/context/CartContext";
import { AuthProvider } from "@/context/AuthContext";
import { FavoritesProvider } from "@/context/FavoritesContext";
import { CompareProvider } from "@/context/CompareContext";

export const metadata: Metadata = {
  title: "Cottonheart - E-commerce Mobile Website",
  description: "Modern e-commerce mobile website built with Next.js, React, and Tailwind CSS",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        <AuthProvider>
          <CartProvider>
            <FavoritesProvider>
            <CompareProvider>{children}</CompareProvider>
          </FavoritesProvider>
          </CartProvider>
        </AuthProvider>
      </body>
    </html>
  );
}

