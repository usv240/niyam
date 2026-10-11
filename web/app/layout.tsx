import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono, Noto_Sans_Devanagari } from "next/font/google";
import { Footer } from "@/components/footer";
import { Header } from "@/components/header";
import { LangProvider } from "@/components/lang";
import { ThemeProvider } from "@/components/theme";
import { SITE } from "@/lib/site";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const deva = Noto_Sans_Devanagari({ subsets: ["devanagari"], weight: ["400", "500", "600"], variable: "--font-deva", display: "swap" });
const mono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-mono", display: "swap" });

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"),
  title: { default: "Niyam: welfare rules that stay in sync with the law", template: "%s | Niyam" },
  description: SITE.description,
  openGraph: { title: "Niyam", description: SITE.description, type: "website" },
  twitter: { card: "summary_large_image", title: "Niyam", description: SITE.description },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0b0f17" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning className={`${inter.variable} ${deva.variable} ${mono.variable}`}>
      <body className="min-h-screen">
        <ThemeProvider>
          <LangProvider>
            <Header />
            <main id="main">{children}</main>
            <Footer />
          </LangProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
