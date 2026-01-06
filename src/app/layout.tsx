import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Providers } from "@/components/providers/session-provider";

export const metadata: Metadata = {
  title: "CleanDayCRM - Simple CRM for Home Cleaners",
  description: "Calendar, clients, payments, and reminders for independent home cleaners",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="font-sans">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
