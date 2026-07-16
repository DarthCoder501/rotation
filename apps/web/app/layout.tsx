import { Fraunces, DM_Sans } from "next/font/google";
import type { Metadata, Viewport } from "next";
import { AuthProvider } from "@/components/auth/AuthProvider";
import { SkipLink } from "@/components/shell/SkipLink";
import "./globals.css";

const fraunces = Fraunces({ subsets: ["latin"], variable: "--font-display" });
const dmSans = DM_Sans({ subsets: ["latin"], variable: "--font-body" });

export const metadata: Metadata = {
  title: {
    default: "Rotation",
    template: "%s · Rotation",
  },
  description:
    "Daily fragrance recommendations from your collection — taste, weather, and context.",
  applicationName: "Rotation",
};

export const viewport: Viewport = {
  themeColor: "#050505",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${fraunces.variable} ${dmSans.variable}`}>
      <body className="bg-(--bg-deep) text-(--text-primary) font-(family-name:--font-body) antialiased">
        <SkipLink />
        <AuthProvider>
          <main id="main-content" tabIndex={-1}>
            {children}
          </main>
        </AuthProvider>
      </body>
    </html>
  );
}
