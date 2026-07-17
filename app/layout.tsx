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
  metadataBase: new URL("https://suzannnenfts.com"),
  title: {
    default: "Suzanne’s Threads — Essays on Digital Art",
    template: "%s · Suzanne’s Threads",
  },
  description: "A chronological reading list of essays on digital art by @nf_suzanne.",
  keywords: ["digital art", "essays", "SuzanneNFTs", "artist threads"],
  openGraph: { title: "Suzanne’s Threads", description: "Essays on digital art.", type: "website" },
  twitter: { card: "summary", title: "Suzanne’s Threads", description: "Essays on digital art." },
  icons: {
    icon: [{ url: "/suzanne-pfp.jpg", type: "image/jpeg" }],
    shortcut: "/suzanne-pfp.jpg",
    apple: "/suzanne-pfp.jpg",
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
