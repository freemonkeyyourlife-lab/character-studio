import type { Metadata, Viewport } from "next";
import "./globals.css";

export const viewport: Viewport = {\n  width: "device-width",\n  initialScale: 1,\n  viewportFit: "cover",\n};\n\nexport const metadata: Metadata = {
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
