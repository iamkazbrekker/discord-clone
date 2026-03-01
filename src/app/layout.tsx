import type { Metadata } from "next";
import { JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { ClerkProvider } from "@clerk/nextjs";
import { ThemeProvider } from "@/components/theme-provider";
import { Providers } from "@/components/providers";

const jetBrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
});


export const metadata: Metadata = {
  title: "irc",
  description: "Go chat ig",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
    <Providers>
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${jetBrainsMono.variable} antialiased`}
      >
        <ThemeProvider
        attribute="class"
        defaultTheme = "dark"
        enableSystem={false}
        storageKey="irc-theme">
        {children}
        </ThemeProvider>
      </body>
    </html>
    </Providers>
    </ClerkProvider>
  );
}
