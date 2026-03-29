import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AkashChat - Real-time Chat",
  description: "Connect with friends in real-time",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
