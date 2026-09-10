import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Artha — the life checklist",
    template: "%s · Artha",
  },
  description:
    "Check off the life experiences that make you who you are. See how rare each one is. Get roasted or encouraged — your call.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
