import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "CommitPost — LinkedIn posts from your git history",
  description:
    "Gere posts profissionais para o LinkedIn a partir dos seus commits do GitHub. BYOK, filtro NDA automático e auto-post via cron.",
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL ?? "https://commitpost.vercel.app"
  ),
  openGraph: {
    title: "CommitPost — LinkedIn posts from your git history",
    description:
      "Transforme seus commits do GitHub em posts profissionais para o LinkedIn. BYOK, filtro NDA, auto-post. 100% grátis.",
    type: "website",
    siteName: "CommitPost",
  },
  twitter: {
    card: "summary_large_image",
    title: "CommitPost",
    description: "LinkedIn posts gerados a partir dos seus commits do GitHub.",
  },
  icons: {
    icon: "/icon",
    apple: "/apple-icon",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR" className={`dark ${inter.variable}`}>
      <body className="font-sans">
        {children}
        <Analytics />
      </body>
    </html>
  );
}
