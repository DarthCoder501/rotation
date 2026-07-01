import { Fraunces, DM_Sans } from "next/font/google";
import { SkipLink } from "@/components/shell/SkipLink";
import "./globals.css";

const fraunces = Fraunces({ subsets: ["latin"], variable: "--font-display" });
const dmSans = DM_Sans({ subsets: ["latin"], variable: "--font-body" });

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${fraunces.variable} ${dmSans.variable}`}>
      <body className="bg-(--bg-deep) text-(--text-primary) font-(family-name:--font-body) antialiased">
        <SkipLink />
        <div id="main-content">{children}</div>
      </body>
    </html>
  );
}
