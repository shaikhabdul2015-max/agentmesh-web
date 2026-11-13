import { NextResponse } from "next/server";

const content = `# AgentMesh Web

> Agent-readable service directory and safe action API. This is a reference MVP with sample data.

## Purpose
Help humans and external agents discover local repair and community service providers. The website exposes public JSON discovery metadata and a policy-bounded HTTP action endpoint.

## Discovery
- Agent profile: /.well-known/agent.json
- A2A-style Agent Card: /.well-known/agent-card.json
- Human interface: /
- Action API: POST /api/agent/execute

## Calling the action API
Send JSON:
{
  "protocol": "agentmesh.v1",
  "action": "list_services",
  "input": { "query": "bicycle repair" },
  "context": { "purpose": "discovery", "requestedBy": "your-agent-id" }
}

Allowed actions:
1. list_services — read-only. Input: { "query": "string, max 100 chars" }.
2. request_quote — stages an ephemeral demo request only. Input: { "serviceId": "known service ID", "description": "string" }. Requires context.humanConfirmed=true. No provider is contacted and no payment is taken.

## Safety and trust
- Use HTTPS in production.
- Treat public manifests as discovery metadata, not proof of identity. Verify domain ownership and any future signatures independently.
- Never send secrets or personal/payment data.
- The server enforces an action allowlist and validates inputs. Unknown actions are rejected.
- Quote requests are in-memory demo records and disappear on restart.
- This MVP does not implement the full A2A task lifecycle or MCP server.

## Response format
Success: { "ok": true, "data": {}, "meta": { "requestId": "...", "policy": "..." } }
Failure: { "ok": false, "error": "message", "meta": { "requestId": "..." } }

## Source
See README.md and LICENSE in the public repository for setup, architecture, limitations and contribution guidance.
`;
export async function GET() {
  return new NextResponse(content, { headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "public, max-age=300" } });
}
