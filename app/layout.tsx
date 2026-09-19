import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Character Studio",
  description: "Create and manage AI characters.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
