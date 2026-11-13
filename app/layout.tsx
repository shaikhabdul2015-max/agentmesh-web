import type { Metadata } from 'next';

export const metadata: Metadata = {
metadataBase: new URL('https://agentmesh-web.vercel.app'),
title: 'AgentMesh Web - Open Agentic Bicycle Portal',
description:
'An open, inspectable bicycle repair service portal connecting humans and autonomous AI agents through the Open Agentic Web.',
openGraph: {
title: 'AgentMesh Web - Open Agentic Bicycle Portal',
description:
'Discover bicycle repair services through an open, inspectable AI agent interface.',
url: 'https://agentmesh-web.vercel.app',
siteName: 'AgentMesh Web',
type: 'website',
},
};

export default function RootLayout({
children,
}: Readonly<{
children: React.ReactNode;
}>) {
return (
<html lang="en">
<body
style={{
fontFamily: 'system-ui, sans-serif',
margin: 0,
padding: '20px',
backgroundColor: '#f1f5f9',
color: '#0f172a',
}}
>
{children}
</body>
</html>
);
}
