# 🚲 AgentMesh Web Ultra — Autonomous Agent-to-Agent (A2A) Commerce Node

**AgentMesh Web Ultra** is a secure, full-stack Next.js reference implementation demonstrating **Autonomous Agent-to-Agent (A2A) Discovery, Negotiation, Policy Guardrails, and Human-in-the-Loop (HITL) Execution**.

🔗 **Live Demo:** [agentmesh-web-lime.vercel.app](https://vercel.app)

---

## ✨ Key Features

- **🔍 Agent Discovery (`/.well-known/agent.json`)**: Automatically fetches and parses machine-readable service manifests before executing any commerce action.
- **🤖 Autonomous Goal Routing**: Evaluates natural-language user goals (e.g., *"Fix my flat tire as cheap as possible"* vs. *"Fastest brake repair"*) to select the optimal service provider based on price or ETA.
- **🤝 Agent-to-Agent (A2A) Price Negotiation**: Enables the client agent to negotiate a real-time **15% discount** with the merchant server, issuing a newly signed confirmation token.
- **🛡️ Policy & Scope Guardrails**: Blocks out-of-scope requests (such as car repairs or food orders) before execution.
- **🔐 Human-in-the-Loop (HITL) & Auto-Approve Policies**:
  - Enforces a **300-second time-bound confirmation token** for manual user approval.
  - Supports configurable **Auto-Approve Spending Limits** (`$0` to `$50`) for frictionless micro-transactions.
- **🔒 Cryptographic Security & Replay Protection**:
  - **Spoof Defense (`HTTP 403`)**: Rejects forged or unsigned confirmation tokens.
  - **Replay Guard (`HTTP 409`)**: Tracks single-use token nonces to block duplicate execution attempts.
  - **Verifiable Receipts**: Generates cryptographic `hmac_proof` receipts upon quote approval.

---

## 🛠️ Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript & React
- **API Architecture**: RESTful Agent Execution Endpoints (`/api/agent/execute`) & `.well-known` Agent Manifests
- **Deployment**: Vercel

---

## 🚀 Getting Started Locally

1. **Clone the repository:**
   ```bash
   git clone https://github.com
   cd agentmesh-web
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Run the development server:**
   ```bash
   npm run dev
   ```

4. **Open in browser:**
   Navigate to `http://localhost:3000` to interact with the AgentMesh Commerce Node.

---

## 🧪 Interactive Demo Scenarios

1. **Standard HITL Flow**: Keep Auto-Approve at `$0`, run *"Fix my flat tire as cheap as possible"*, click **Negotiate 15%** (`$15` → `$13`), and click **Approve Quote** to generate an HMAC-signed receipt.
2. **Autonomous Policy Flow**: Slide **Auto-Approve Limit** to `$20+` and run a goal—the agent completes discovery, selection, and approval automatically.
3. **Security Simulation**: Click **Simulate Spoof (403)** or **Test Replay Guard (409)** after a transaction to inspect live security blocks in the execution logs.
