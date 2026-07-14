import type { Metadata, Viewport } from "next";
import { Inter, Space_Grotesk } from "next/font/google";
import { Providers } from "@/components/layout/providers";
import "./globals.css";
import { Toaster } from "sonner";

const sansFont = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
  display: "swap",
});

const displayFont = Space_Grotesk({
  variable: "--font-display",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "AIAN — Your Company's Brain. Organizational Intelligence Platform.",
  description:
    "AIAN transforms every meeting, message, document, ticket and repository into one intelligent organizational memory your team can search, understand and grow from.",
  authors: [{ name: "AIAN" }],
  openGraph: {
    title: "AIAN — Your Company's Brain. Organizational Intelligence Platform.",
    description:
      "The enterprise organizational intelligence platform. One brain for every meeting, message, doc, ticket and repo.",
    type: "website",
    images: [
      {
        url: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/9328c64a-4ae4-45fb-a387-c3adb56b1c96/id-preview-ea9b12c3--c1e400e4-de77-497a-ba91-fa85b83ba395.lovable.app-1783078500618.png",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "AIAN — Your Company's Brain. Organizational Intelligence Platform.",
    description:
      "Enterprise organizational intelligence. One brain for the modern company.",
    images: [
      "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/9328c64a-4ae4-45fb-a387-c3adb56b1c96/id-preview-ea9b12c3--c1e400e4-de77-497a-ba91-fa85b83ba395.lovable.app-1783078500618.png",
    ],
  },
};

export const viewport: Viewport = {
  themeColor: "#090A0F",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${sansFont.variable} ${displayFont.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col">
        <Providers>{children}</Providers>
        <Toaster richColors position="top-right" />
      </body>
    </html>
  );
}
