import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: process.env.NEXT_PUBLIC_APP_NAME || "DP HR FAQ Portal",
  description: "Datapath's internal HR FAQ and contact-routing assistant.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-[var(--color-canvas)] text-[var(--color-ink)]">
        {children}
      </body>
    </html>
  );
}
