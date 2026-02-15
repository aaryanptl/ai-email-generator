import type { Metadata } from "next";
import { Geist } from "next/font/google";
import { ConvexClientProvider } from "@/components/convex-client-provider";
import { getToken } from "@/lib/auth-server";
import "./globals.css";

const geist = Geist({
  subsets: ["latin"],
  variable: "--font-geist",
});

export const metadata: Metadata = {
  title: "AI Email Generator",
  description: "Generate beautiful email templates with AI using React Email",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const initialToken = await getToken();

  return (
    <html lang="en">
      <body className={`${geist.className}`} style={{ margin: 0, padding: 0 }}>
        <ConvexClientProvider initialToken={initialToken ?? null}>
          {children}
        </ConvexClientProvider>
      </body>
    </html>
  );
}
