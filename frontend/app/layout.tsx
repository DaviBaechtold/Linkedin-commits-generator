import type { Metadata } from "next";
import "./globals.css";

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
    <html lang="pt-BR" className="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="font-sans">{children}</body>
    </html>
  );
}
