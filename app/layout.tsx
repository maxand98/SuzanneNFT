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
    default: "Suzanne’s Threads — Tweet Essays on Digital Art",
    template: "%s · Suzanne’s Threads",
  },
  description: "A chronological reading list of tweet essays on digital art by @nf_suzanne.",
  keywords: ["digital art", "tweet essays", "SuzanneNFTs", "artist threads"],
  openGraph: { title: "Suzanne’s Threads", description: "Tweet essays on digital art.", type: "website" },
  twitter: { card: "summary", title: "Suzanne’s Threads", description: "Tweet essays on digital art." },
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
