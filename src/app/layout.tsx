import type { Metadata } from "next";
import { Open_Sans } from "next/font/google";
import "./globals.css";
import { ClerkProvider } from "@clerk/nextjs";
import { ThemeProvider } from "@/components/theme-provider";

const openSans = Open_Sans({
  variable: "--font-open-sans",
  subsets: ["latin"],
});


export const metadata: Metadata = {
  title: "Discord",
  description: "Go chat ig",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${openSans.variable} antialiased`}
      >
        <ThemeProvider
        attribute="class"
        defaultTheme = "dark"
        enableSystem={false}
        storageKey="discord-theme">
        {children}
        </ThemeProvider>
      </body>
    </html>
    </ClerkProvider>
  );
}
