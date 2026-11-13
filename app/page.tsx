'use client';
import { useState } from 'react';

export default function HomePage() {
  const [logs, setLogs] = useState<string[]>(['Agent Inspector ready. Enter a goal or run manual steps below.']);
  const [goal, setGoal] = useState('My bicycle tire is punctured, get a quote');
  const [token, setToken] = useState('');
  const [service, setService] = useState('tune-up');
  const [status, setStatus] = useState('Idle');
  const [running, setRunning] = useState(false);

  const log = (m: string) => setLogs((p) => [`[${new Date().toLocaleTimeString()}] ${m}`, ...p]);
  const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

  const discover = async () => {
    const r = await fetch('/.well-known/agent.json');
    const d = await r.json();
    log(`1. Discovered Manifest: ${d.name} | Capabilities: ${d.capabilities?.join(', ')}`);
    return d;
  };

  const listServices = async () => {
    const r = await fetch('/api/agent/execute', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'list_services' })
    });
    const d = await r.json();
    log(`2. Fetched Catalog: ${d.services.map((s: { name: string; price: string }) => `${s.name} (${s.price})`).join(' | ')}`);
    return d.services;
  };

  const requestQuote = async (targetService: string) => {
    const r = await fetch('/api/agent/execute', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'request_quote', service_id: targetService })
    });
    const d = await r.json();
    if (d.confirmation_token) {
      setToken(d.confirmation_token);
      setStatus('Pending Human Approval');
      log(`3. HITL Gate Triggered (HTTP 403): Server issued cryptographic HMAC token for "${targetService}". Awaiting human approval...`);
    }
  };

  const runAutonomousAgent = async () => {
    if (running || token) return;
    setRunning(true);
    setStatus('Agent Running...');
    log(`--- Autonomous Agent Started | Goal: "${goal}" ---`);
    try {
      await discover();
      await sleep(700);
      await listServices();
      await sleep(700);

      const q = goal.toLowerCase();
      let matched = 'tune-up';
      if (q.includes('tire') || q.includes('puncture') || q.includes('flat') || q.includes('tube')) {
        matched = 'flat-tire';
      } else if (q.includes('brake') || q.includes('bleed') || q.includes('stop')) {
        matched = 'brake-bleed';
      }
      setService(matched);
      log(`Agent Reasoning: Matched user intent to service "${matched}". Requesting quote...`);
      await sleep(700);
      await requestQuote(matched);
    } catch {
      log('Agent Error: Failed to complete autonomous workflow.');
      setStatus('Error');
    } finally {
      setRunning(false);
    }
  };

  const approveQuote = async () => {
    const r = await fetch('/api/agent/execute', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'request_quote', service_id: service, confirmation_token: token, human_confirmed: true })
    });
    const d = await r.json();
    setToken('');
    if (r.ok) {
      setStatus('Approved');
      log(`4. Human Approved! Verified Quote ID: ${d.quote_id}`);
    } else {
      setStatus('Rejected');
      log(`Error: ${d.error}`);
    }
  };

  const rejectQuote = () => {
    setToken('');
    setStatus('Rejected');
    log('4. Human Rejected: Agent request denied and HMAC token discarded.');
  };

  return (
    <div style={{ maxWidth: '760px', margin: '0 auto', fontFamily: 'system-ui, sans-serif' }}>
      <div style={{ background: '#0f172a', color: '#fff', padding: '20px', borderRadius: '10px', marginBottom: '16px' }}>
        <h1 style={{ margin: 0, fontSize: '1.5rem' }}>AgentMesh Web</h1>
        <p style={{ margin: '6px 0 0', color: '#94a3b8' }}>Open Agentic Web Bicycle Portal — Status: <strong>{status}</strong></p>
      </div>

      <div style={{ background: '#fff', padding: '16px', borderRadius: '10px', marginBottom: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
        <h2 style={{ marginTop: 0, fontSize: '1.15rem' }}>1. Autonomous External AI Agent Simulator</h2>
        <p style={{ fontSize: '14px', color: '#475569', marginTop: 0 }}>
          Type a repair request below. The external AI agent will automatically discover <code>agent.json</code>, inspect services, select the right repair, and pause at the cryptographic HITL gate.
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
          <input
            type="text"
            value={goal}
            onChange={(e) => setGoal(e.target.value)}
            disabled={running || !!token}
            placeholder="e.g. Fix my flat tire or bleed brakes..."
            style={{ flex: '1 1 240px', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
          />
          <button
            onClick={runAutonomousAgent}
            disabled={running || !!token}
            style={{ padding: '10px 16px', background: running || token ? '#94a3b8' : '#2563eb', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: running || token ? 'not-allowed' : 'pointer' }}
          >
            {running ? 'Agent Working...' : 'Run Autonomous Agent'}
          </button>
        </div>
      </div>

      <div style={{ background: '#fff', padding: '16px', borderRadius: '10px', marginBottom: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
        <h2 style={{ marginTop: 0, fontSize: '1.15rem' }}>2. Manual Inspector & Human-in-the-Loop Gate</h2>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '12px' }}>
          <button onClick={discover} disabled={running} style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#f8fafc' }}>Discover</button>
          <button onClick={listServices} disabled={running} style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#f8fafc' }}>List Services</button>
          <select value={service} onChange={(e) => setService(e.target.value)} disabled={!!token || running} style={{ padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1' }}>
            <option value="tune-up">Full Tune-Up ($45)</option>
            <option value="flat-tire">Flat Tire ($20)</option>
            <option value="brake-bleed">Brake Bleed ($35)</option>
          </select>
          <button onClick={() => requestQuote(service)} disabled={!!token || running} style={{ padding: '8px 12px', background: token ? '#cbd5e1' : '#f59e0b', border: 'none', borderRadius: '6px', fontWeight: 'bold' }}>Request Quote</button>
          <button onClick={approveQuote} disabled={!token} style={{ padding: '8px 12px', background: token ? '#16a34a' : '#cbd5e1', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 'bold' }}>Human Approve</button>
          {token && (
            <button onClick={rejectQuote} style={{ padding: '8px 12px', background: '#dc2626', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 'bold' }}>Reject</button>
          )}
        </div>
        <div style={{ background: '#0f172a', color: '#38bdf8', padding: '12px', borderRadius: '8px', fontFamily: 'monospace', fontSize: '12px', maxHeight: '240px', overflowY: 'auto' }}>
          {logs.map((l, i) => <div key={i} style={{ marginBottom: '5px' }}>{l}</div>)}
        </div>
        <p style={{ fontSize: '13px', color: '#64748b', marginBottom: 0, marginTop: '10px' }}>
          Open Standards: <a href="/.well-known/agent.json">/.well-known/agent.json</a> | <a href="/llms.txt">/llms.txt</a>
        </p>
      </div>
    </div>
  );
}
