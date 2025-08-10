import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

export const metadata: Metadata = {
  title: "Slack Connect - Message Scheduling & Workspace Management",
  description: "Connect your Slack workspace and send messages with Slack Connect. Schedule messages, manage workspaces, and automate your Slack communication.",
  keywords: ["Slack Connect", "Slack", "OAuth 2.0", "Message Scheduling", "Workspace Management", "Automation"],
  authors: [{ name: "Slack Connect Team" }],
  openGraph: {
    title: "Slack Connect",
    description: "Connect your Slack workspace and schedule messages with ease",
    url: "https://localhost:3000",
    siteName: "Slack Connect",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Slack Connect",
    description: "Connect your Slack workspace and schedule messages with ease",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased bg-background text-foreground">
        {children}
        <Toaster />
      </body>
    </html>
  );
}
