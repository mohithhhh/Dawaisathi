import type { Metadata, Viewport } from "next";
import "./globals.css";
import PostHogProvider from "@/components/PostHogProvider";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#fbe2a7",
};

export const metadata: Metadata = {
  metadataBase: new URL("https://dawaisathi.vercel.app"),
  title: "DawaiSathi — Understand Your Medicine In Your Language",
  description:
    "AI-powered medicine explanation in Hindi, Kannada, Tamil, Telugu, Malayalam and 7 more Indian languages. Free to try.",
  keywords:
    "medicine explanation Hindi, dawai jankari, medicine in Kannada, prescription help India, दवाई जानकारी",
  icons: {
    icon: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>💊</text></svg>",
  },
  openGraph: {
    title: "DawaiSathi — दवाई साथी",
    description:
      "Understand your medicine in your language. Free AI explanation in 11 Indian languages.",
    url: "https://dawaisathi.vercel.app",
    siteName: "DawaiSathi",
    images: [
      {
        url: "/opengraph-image",
        width: 1200,
        height: 630,
      },
    ],
    locale: "en_IN",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "DawaiSathi — Medicine in Your Language",
    description: "Free AI medicine explanation in 11 Indian languages",
    images: ["/opengraph-image"],
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
        <PostHogProvider>{children}</PostHogProvider>
      </body>
    </html>
  );
}
