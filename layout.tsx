import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AgentMesh Web — Open services for the agentic web",
  description: "A human-friendly service directory with machine-readable discovery, policy-aware actions and transparent agent inspection.",
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"),
  alternates: { canonical: "/" },
  other: {
    "agent-discovery": "/.well-known/agent.json",
    "a2a-agent-card": "/.well-known/agent-card.json"
  }
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
