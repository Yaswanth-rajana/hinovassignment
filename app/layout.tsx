import type { Metadata } from "next";
import { Inter, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from 'react-hot-toast';
import { UserProvider } from '@/contexts/UserContext';
import Navbar from '@/components/layout/Navbar';

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Blog Platform",
  description: "A blogging platform with AI-powered summaries",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${inter.variable} ${geistMono.variable} font-sans antialiased text-gray-900`}
      >
        <UserProvider>
          <Navbar />
          <main className="min-h-screen bg-gray-50/50">
            {children}
          </main>
          <Toaster 
            position="bottom-right" 
            toastOptions={{
              className: '!bg-white !text-gray-900 !rounded-xl !shadow-xl border border-gray-100',
              success: {
                iconTheme: { primary: '#4f46e5', secondary: '#fff' },
              },
            }}
          />
        </UserProvider>
      </body>
    </html>
  )
}