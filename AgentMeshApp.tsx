"use client";

import { useState } from "react";

type EventItem = { title: string; detail: string; status: "ok" | "pending" | "warn" };
const initialEvents: EventItem[] = [
  { title: "AgentMesh initialized", detail: "Human UI and public agent endpoints are ready.", status: "ok" }
];

export default function AgentMeshApp() {
  const [events, setEvents] = useState<EventItem[]>(initialEvents);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [query, setQuery] = useState("bicycle repair");
  const [view, setView] = useState<"human" | "inspector">("human");

  function log(title: string, detail: string, status: EventItem["status"] = "ok") {
    setEvents(old => [{ title, detail, status }, ...old].slice(0, 12));
  }

  async function discoverAndExecute() {
    setBusy(true); setResult(null);
    try {
      log("Discovery", "GET /.well-known/agent.json");
      const cardRes = await fetch("/.well-known/agent.json");
      if (!cardRes.ok) throw new Error("Discovery manifest could not be fetched.");
      const card = await cardRes.json();
      log("Manifest received", `${card.name} · ${card.version} · ${card.capabilities.length} capabilities`);

      log("Policy check", "Checking declared permissions and HTTPS/origin policy.");
      const secure = location.protocol === "https:" || location.hostname === "localhost";
      if (!secure) log("Transport warning", "This demo is not running over HTTPS.", "warn");
      else log("Transport check", "Secure context (or localhost development) confirmed.");

      log("Agent action", "POST /api/agent/execute · action=list_services");
      const response = await fetch("/api/agent/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          protocol: "agentmesh.v1",
          action: "list_services",
          input: { query },
          context: { purpose: "demo-discovery", requestedBy: "browser-agent-demo" }
        })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Agent action failed.");
      setResult(data);
      log("Action completed", `Returned ${data.data.items.length} matching services.`);
      log("Audit receipt", `Request ${data.meta.requestId} · policy ${data.meta.policy}`);
    } catch (error: any) {
      log("Agent error", error.message || "Unknown error", "warn");
      setResult({ error: error.message });
    } finally { setBusy(false); }
  }

  async function requestQuote(serviceId: string) {
    setBusy(true);
    try {
      const response = await fetch("/api/agent/execute", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          protocol: "agentmesh.v1", action: "request_quote",
          input: { serviceId, description: "Please contact me with an indicative quote." },
          context: { purpose: "human-approved-demo", requestedBy: "human-ui", humanConfirmed: true }
        })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Quote request failed.");
      setResult(data);
      log("Quote request staged", `Reference ${data.data.requestId}. Demo only; no message was sent.`);
    } catch (e: any) { log("Action error", e.message, "warn"); }
    finally { setBusy(false); }
  }

  return <main className="shell">
    <nav className="nav"><div className="brand"><span className="brandMark">◎</span> AgentMesh <b>Web</b></div><div className="navRight"><span className="liveDot"/> OPEN PROTOCOL DEMO</div></nav>
    <section className="hero">
      <div className="eyebrow">THE OPEN AGENTIC WEB · A REFERENCE IMPLEMENTATION</div>
      <h1>Services that people<br/><em>and agents</em> can use.</h1>
      <p className="sub">Discover trusted local services through open web standards. Humans get a clean directory. Agents get a public manifest, explicit capabilities, policy-bounded actions and an inspectable audit trail.</p>
      <div className="heroActions"><a className="button primary" href="#directory">Explore services <span>↘</span></a><button className="button ghost" onClick={() => setView("inspector")}>Open Agent Inspector ↗</button></div>
      <div className="metrics"><div><strong>01</strong><span>OPEN DISCOVERY</span></div><div><strong>02</strong><span>POLICY-BOUNDED ACTIONS</span></div><div><strong>03</strong><span>VISIBLE PROVENANCE</span></div></div>
    </section>

    <section className="workspace" id="directory">
      <div className="sectionHead"><div><div className="eyebrow">SERVICE NETWORK</div><h2>Find a local expert</h2></div><div className="tabs"><button className={view === "human" ? "active" : ""} onClick={() => setView("human")}>Human view</button><button className={view === "inspector" ? "active" : ""} onClick={() => setView("inspector")}>Agent Inspector <span className="tinyPulse"/></button></div></div>
      {view === "human" ? <div className="directory">
        <div className="searchBox"><span>⌕</span><input value={query} onChange={e => setQuery(e.target.value)} onKeyDown={e => e.key === "Enter" && discoverAndExecute()} placeholder="What service do you need?"/><button onClick={discoverAndExecute} disabled={busy}>{busy ? "Searching…" : "Search services →"}</button></div>
        <div className="serviceGrid">
          {[
            {id:"svc-cycle-01",name:"CycleFix Collective",type:"BICYCLE REPAIR",desc:"Community-run bicycle repair, tune-ups and safety checks.",location:"Brooklyn · Remote booking",price:"From $20",icon:"🚲"},
            {id:"svc-device-02",name:"Reboot Repair Lab",type:"DEVICE REPAIR",desc:"Independent laptop and phone diagnostics with transparent estimates.",location:"Manhattan · Appointment",price:"Estimate first",icon:"⌘"},
            {id:"svc-home-03",name:"GoodHands Home Care",type:"HOME SERVICES",desc:"Small home repairs, furniture assembly and accessibility fixes.",location:"Queens · On-site",price:"From $35",icon:"⌂"}
          ].map(s => <article className="serviceCard" key={s.id}><div className="cardTop"><span className="serviceIcon">{s.icon}</span><span className="verified">● DISCOVERABLE</span></div><div className="eyebrow">{s.type}</div><h3>{s.name}</h3><p>{s.desc}</p><div className="cardFoot"><span>{s.location}</span><b>{s.price}</b></div><button className="textButton" onClick={() => requestQuote(s.id)} disabled={busy}>Request indicative quote ↗</button></article>)}
        </div>
        <p className="finePrint">Sample directory data for the MVP. Quote requests are stored only in server memory and do not contact providers.</p>
      </div> : <div className="inspector">
        <div className="inspectorMain">
          <div className="inspectorTitle"><div><div className="eyebrow">LIVE EXECUTION TRACE</div><h3>Agent session</h3></div><span className="sessionPill"><i/> SESSION READY</span></div>
          <p className="muted">Run a realistic discovery → policy check → action sequence against this website's own public endpoints.</p>
          <div className="terminal">
            <div className="terminalBar"><span/><span/><span/><label>agentmesh://session/local</label></div>
            <div className="events">{events.map((ev,i) => <div className="event" key={i}><span className={`eventDot ${ev.status}`}/><div><b>{ev.title}</b><small>{ev.detail}</small></div><time>{i === 0 ? "NOW" : `${i * 2}s`}</time></div>)}</div>
          </div>
          <div className="runRow"><input value={query} onChange={e => setQuery(e.target.value)} aria-label="Agent search query"/><button className="button primary" disabled={busy} onClick={discoverAndExecute}>{busy ? "Running…" : "▶ Run agent flow"}</button></div>
          {result && <pre className="result">{JSON.stringify(result, null, 2)}</pre>}
        </div>
        <aside className="inspectorSide"><div className="eyebrow">PUBLIC SURFACES</div><h4>Machine-readable by design</h4>{[
          ["/.well-known/agent.json","AgentMesh discovery profile"],
          ["/.well-known/agent-card.json","A2A Agent Card (v1.0)"],
          ["/llms.txt","Human/LLM-readable guide"],
          ["/api/agent/execute","Policy-checked action API"]
        ].map(([path,label])=><a className="endpoint" href={path} target="_blank" rel="noreferrer" key={path}><span>{path}</span><small>{label} ↗</small></a>)}<div className="trustBox"><span>◈</span><div><b>Trust, not blind faith</b><p>Manifest discovery and HTTPS checks are visible. This MVP does not claim cryptographic identity verification.</p></div></div></aside>
      </div>}
    </section>
    <footer><span>AGENTMESH WEB · OPEN SOURCE REFERENCE BUILD</span><span>Built on HTML · JSON · HTTP · A2A-inspired discovery</span></footer>
  </main>;
}
