import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "DawaiSathi — Medicine Explainer",
  description:
    "Understand your medicines in Hindi, Kannada, Telugu, Tamil, Malayalam & English. Simple explanations for Indian patients.",
  keywords: "medicine, दवाई, pharmacy, India, Hindi, Kannada, Telugu",
  viewport: "width=device-width, initial-scale=1, maximum-scale=1",
  themeColor: "#fbe2a7",
  icons: {
    icon: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>💊</text></svg>",
  },
  openGraph: {
    title: "DawaiSathi",
    description: "Medicine explanations in your language",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="hi" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
      </head>
      <body className="font-sans antialiased">
        {children}
      </body>
    </html>
  );
}
