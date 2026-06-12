import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "CommitPost — LinkedIn posts from your git history",
  description:
    "Gere posts profissionais para o LinkedIn a partir dos seus commits do GitHub, com revisão antes de publicar.",
  openGraph: {
    title: "CommitPost",
    description: "LinkedIn posts gerados a partir dos seus commits.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR" className={`dark ${inter.variable}`}>
      <body className="font-sans">{children}</body>
    </html>
  );
}
