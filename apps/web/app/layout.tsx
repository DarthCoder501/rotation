import { Fraunces, DM_Sans } from "next/font/google";
import type { Metadata, Viewport } from "next";
import { SerwistProvider } from "@serwist/turbopack/react";
import { AuthProvider } from "@/components/auth/AuthProvider";
import { InstallPrompt } from "@/components/pwa/InstallPrompt";
import { SkipLink } from "@/components/shell/SkipLink";
import { WearProvider } from "@/components/wear/WearProvider";
import "./globals.css";

const fraunces = Fraunces({ subsets: ["latin"], variable: "--font-display" });
const dmSans = DM_Sans({ subsets: ["latin"], variable: "--font-body" });

const APP_NAME = "Rotation";
const APP_DEFAULT_TITLE = "Rotation";
const APP_TITLE_TEMPLATE = "%s · Rotation";
const APP_DESCRIPTION =
  "Daily fragrance recommendations from your collection — taste, weather, and context.";

export const metadata: Metadata = {
  applicationName: APP_NAME,
  title: {
    default: APP_DEFAULT_TITLE,
    template: APP_TITLE_TEMPLATE,
  },
  description: APP_DESCRIPTION,
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: APP_DEFAULT_TITLE,
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180" }],
  },
  openGraph: {
    type: "website",
    siteName: APP_NAME,
    title: {
      default: APP_DEFAULT_TITLE,
      template: APP_TITLE_TEMPLATE,
    },
    description: APP_DESCRIPTION,
  },
  twitter: {
    card: "summary",
    title: {
      default: APP_DEFAULT_TITLE,
      template: APP_TITLE_TEMPLATE,
    },
    description: APP_DESCRIPTION,
  },
};

export const viewport: Viewport = {
  themeColor: "#050505",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  colorScheme: "dark",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${fraunces.variable} ${dmSans.variable}`}>
      <body className="bg-(--bg-deep) text-(--text-primary) font-(family-name:--font-body) antialiased">
        <SerwistProvider swUrl="/serwist/sw.js">
          <SkipLink />
          <AuthProvider>
            <WearProvider>
              <main id="main-content" tabIndex={-1}>
                {children}
              </main>
              <InstallPrompt />
            </WearProvider>
          </AuthProvider>
        </SerwistProvider>
      </body>
    </html>
  );
}
