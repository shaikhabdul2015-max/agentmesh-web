# AgentMesh Web

**An open, inspectable service portal for humans and independent web agents.**

AgentMesh Web demonstrates a practical Open Agentic Web building block: a service directory that can be discovered through standard web paths, understood from plain text and structured metadata, and called through a narrowly scoped JSON API.

## Why this matters

Today, an agent often needs a platform-specific integration or brittle page scraping to interact with a business. AgentMesh publishes capabilities on the open web and exposes deterministic actions over ordinary HTTPS. A human can inspect the same workflow in the UI.

### MVP use case

A person or personal browser agent needs a bicycle repair shop. The agent:
1. Fetches `/.well-known/agent.json` to discover the site and its actions.
2. Reads `/llms.txt` for instructions and policy.
3. Optionally reads `/.well-known/agent-card.json` for A2A-style agent metadata.
4. Calls `POST /api/agent/execute` with `list_services`.
5. Presents results to the person.
6. Only after explicit human confirmation, may stage a demo quote request.

## Architecture

```text
Human browser / external agent
          |
          | GET /.well-known/agent.json
          | GET /.well-known/agent-card.json
          | GET /llms.txt
          v
   AgentMesh discovery layer
          |
          | POST /api/agent/execute
          v
  Zod schema validation + action allowlist
          |
          +--> list_services (read-only)
          |
          +--> request_quote (human confirmation required)
                         |
                         v
               ephemeral demo record
```

### Stack
- Next.js 14 App Router + TypeScript
- React UI with Human View and live Agent Inspector
- Zod request validation
- Plain HTTP/JSON and standard well-known paths
- Deployable to Vercel or any Node.js host

### Open-web interoperability
- `/.well-known/agent.json`: AgentMesh discovery profile (custom, versioned).
- `/.well-known/agent-card.json`: A2A v1.0-style Agent Card metadata. This project does **not** claim full A2A task protocol conformance.
- `/llms.txt`: concise plain-text instructions for agents and developers.
- JSON-LD `WebSite` metadata embedded in the home page.
- Semantic HTML landmarks, headings, buttons, links and form controls.

## Run locally

Requirements: Node.js 18.17+ and npm.

```bash
git clone https://github.com/YOUR-USERNAME/agentmesh-web.git
cd agentmesh-web
cp .env.example .env.local
npm install
npm run dev
```

Open `http://localhost:3000`.

Build check:

```bash
npm run build
npm start
```

## Test the public surfaces

```bash
curl http://localhost:3000/.well-known/agent.json
curl http://localhost:3000/.well-known/agent-card.json
curl http://localhost:3000/llms.txt
```

Read-only discovery action:

```bash
curl -X POST http://localhost:3000/api/agent/execute \
  -H "Content-Type: application/json" \
  -d '{
    "protocol": "agentmesh.v1",
    "action": "list_services",
    "input": { "query": "bicycle repair" },
    "context": { "purpose": "demo", "requestedBy": "curl-agent" }
  }'
```

Human-confirmed demo request:

```bash
curl -X POST http://localhost:3000/api/agent/execute \
  -H "Content-Type: application/json" \
  -d '{
    "protocol": "agentmesh.v1",
    "action": "request_quote",
    "input": {
      "serviceId": "svc-cycle-01",
      "description": "Please share an indicative quote for a tune-up."
    },
    "context": {
      "purpose": "human-approved-demo",
      "requestedBy": "curl-agent",
      "humanConfirmed": true
    }
  }'
```

The quote action only stages an in-memory demo record. It does not contact a provider, create a real appointment, or take payment.

## Deploy to Vercel

1. Push this repository to GitHub.
2. Import it into Vercel.
3. Set `NEXT_PUBLIC_SITE_URL` to the final public HTTPS origin, e.g. `https://your-project.vercel.app`.
4. Deploy.
5. Verify all three discovery URLs and the POST action endpoint on the live domain.

For Render, create a Node web service, use `npm install` as build command and `npm run build && npm start` as start command. Set `NEXT_PUBLIC_SITE_URL` to the public HTTPS origin.

## Trust and safety model

This is a teaching MVP, not a production trust authority.

- HTTPS is required in production.
- Public manifests are **claims**, not cryptographic proof of identity. A production deployment should bind domain ownership to a verified publisher identity and sign manifests (for example, JWS/Ed25519), with key rotation and revocation.
- The action API has a fixed allowlist and strict input schemas.
- No arbitrary URL fetching, shell execution, payment, credential collection or cross-site proxying is exposed.
- Quote staging requires an explicit confirmation flag. In a real product, confirmation must be bound to an authenticated user/session and a specific action summary; a client-supplied boolean alone is not sufficient authorization.
- Add persistent storage, abuse controls, rate limiting, monitoring, privacy/retention policy and provider verification before production.
- The demo dataset and quote records are in-memory and reset on process restart. Serverless deployments may not preserve state between invocations.

## Protocol roadmap

1. Add a real A2A server implementation and task lifecycle using the current A2A specification and official SDKs.
2. Add MCP tools/resources for directory search and service-provider onboarding.
3. Add signed manifests, issuer identity, key rotation and a public verification UI.
4. Add user-controlled consent grants and revocable scoped tokens.
5. Replace sample data with a verified provider registry and auditable persistent storage.
6. Add an optional agent runtime/router (e.g. Mozilla Otari) behind an explicit adapter; do not make model inference necessary for deterministic actions.

## Two-minute hackathon demo

**0:00–0:20 — The problem**  
“Most websites are built for humans. Agents either scrape pages or depend on closed integrations. AgentMesh makes a service website discoverable and actionable using the web we already have.”

**0:20–0:45 — Open discovery**  
“Here is the human service directory. Now I open the Agent Inspector. It fetches `/.well-known/agent.json`, the A2A-style Agent Card and `llms.txt`. No proprietary registry is required to understand the site's public capabilities.”

**0:45–1:15 — Agent executes a task**  
“I run a bicycle repair search. The browser agent sends a structured JSON request to the same HTTP API any independent agent can call. The server validates the schema and allows only the declared read-only action.”

**1:15–1:40 — Consent and safety**  
“Quote requests are a separate capability and require explicit confirmation. The demo only stages an ephemeral record; it cannot contact a provider or take payment. The UI shows the request receipt and policy decision.”

**1:40–2:00 — Open contribution**  
“AgentMesh is MIT-licensed and built on HTML, JSON and HTTPS. Next we can add signed identity, real A2A task interoperability and MCP tools. The goal is a web where agents can discover and cooperate across independent sites without surrendering user control.”

## Hackathon alignment

- **Technological implementation:** machine-readable discovery, JSON-LD, plain-text agent instructions, typed action API and validation.
- **Design:** coherent human-facing service directory plus live inspector.
- **Potential impact:** reduces the integration barrier for local and community service providers.
- **Idea quality:** consent-aware action design and visible trust boundaries rather than opaque automation.

## License

MIT. See [LICENSE](./LICENSE). Sample service names and records are fictional demonstration data.
