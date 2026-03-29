import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Akash Dev | Full Stack Developer Portfolio",
    template: "%s | Akash Dev",
  },
  description: "Full Stack Developer specializing in React, Next.js, Node.js, and cloud-native solutions. View my projects and blog posts.",
  keywords: ["Akash Dev", "Full Stack Developer", "React", "Next.js", "TypeScript", "Node.js", "Web Development", "Portfolio"],
  authors: [{ name: "Akash Dev" }],
  icons: {
    icon: "/favicon.ico",
  },
  openGraph: {
    title: "Akash Dev | Full Stack Developer",
    description: "Full Stack Developer specializing in React, Next.js, Node.js, and cloud-native solutions.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Akash Dev | Full Stack Developer",
    description: "Full Stack Developer specializing in React, Next.js, Node.js, and cloud-native solutions.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning className="dark">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        {children}
        <Toaster position="bottom-right" />
      </body>
    </html>
  );
}
