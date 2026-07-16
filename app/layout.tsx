import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://suzannenfts.com"),
  title: {
    default: "Suzanne’s Threads — Digital Art Thread Archive",
    template: "%s · Suzanne’s Threads",
  },
  description: "An unofficial archive of @nf_suzanne’s insightful threads on digital art and NFT artists, connected to artist profiles on Raster.",
  keywords: ["digital art", "NFT artists", "SuzanneNFTs", "Raster", "artist threads"],
  openGraph: { title: "Suzanne’s Threads", description: "The digital art threads worth keeping.", type: "website" },
  twitter: { card: "summary", title: "Suzanne’s Threads", description: "The digital art threads worth keeping." },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
