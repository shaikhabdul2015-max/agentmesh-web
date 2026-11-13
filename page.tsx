import AgentMeshApp from "@/components/AgentMeshApp";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
const jsonLd = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: "AgentMesh Web",
  url: siteUrl,
  description: "A transparent, agent-readable directory for discovering local repair and community services.",
  potentialAction: {
    "@type": "SearchAction",
    target: `${siteUrl}/api/agent/execute`,
    "query-input": "required name=query"
  }
};

export default function Home() {
  return <>
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
    <AgentMeshApp />
  </>;
}
