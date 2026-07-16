import type { Metadata } from "next";
import { Montserrat } from "next/font/google";
import "./globals.css";

// The mockup uses a geometric sans; Montserrat is the closest free match.
const montserrat = Montserrat({
  variable: "--font-montserrat",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Contactez l’agence",
  description:
    "Formulaire de contact de l’agence : demande de visite, rappel téléphonique ou photos supplémentaires.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" className={`${montserrat.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col font-sans">{children}</body>
    </html>
  );
}
