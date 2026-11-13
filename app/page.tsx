'use client';
import { useState } from 'react';

export default function HomePage() {
  const [logs, setLogs] = useState<string[]>(['Agent Inspector ready.']);
  const [token, setToken] = useState('');
  const [service, setService] = useState('tune-up');
  const [status, setStatus] = useState('Idle');

  const log = (m: string) => setLogs((p) => [`[${new Date().toLocaleTimeString()}] ${m}`, ...p]);

  const discover = async () => {
    const r = await fetch('/.well-known/agent.json');
    const d = await r.json();
    log(`Manifest: ${d.name} | Actions: ${d.actions.map((a: { name: string }) => a.name).join(', ')}`);
  };

  const listServices = async () => {
    const r = await fetch('/api/agent/execute', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'list_services' })
    });
    const d = await r.json();
    log(`Services: ${JSON.stringify(d.services)}`);
  };

  const requestQuote = async () => {
    const r = await fetch('/api/agent/execute', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'request_quote', service_id: service })
    });
    const d = await r.json();
    if (d.confirmation_token) {
      setToken(d.confirmation_token);
      setStatus('Pending Approval');
      log('HTTP 403 Blocked: Server issued HMAC token. Waiting for Human Approval...');
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
      log(`Approved! Quote ID: ${d.quote_id}`);
    } else {
      setStatus('Rejected');
      log(`Error: ${d.error}`);
    }
  };

  return (
    <div style={{ maxWidth: '750px', margin: '0 auto', fontFamily: 'sans-serif' }}>
      <div style={{ background: '#0f172a', color: '#fff', padding: '20px', borderRadius: '10px', marginBottom: '16px' }}>
        <h1 style={{ margin: 0 }}>AgentMesh Web</h1>
        <p style={{ margin: '6px 0 0', color: '#94a3b8' }}>Open Agentic Web Bicycle Portal (Status: {status})</p>
      </div>

      <div style={{ background: '#fff', padding: '16px', borderRadius: '10px', marginBottom: '16px' }}>
        <h2 style={{ marginTop: 0 }}>1. Services</h2>
        <p>Tune-Up ($45) | Flat Tire ($20) | Brake Bleed ($35)</p>
        <p><a href="/.well-known/agent.json">agent.json</a> | <a href="/llms.txt">llms.txt</a></p>
      </div>

      <div style={{ background: '#fff', padding: '16px', borderRadius: '10px' }}>
        <h2 style={{ marginTop: 0 }}>2. Agent Inspector & HITL Gate</h2>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '12px' }}>
          <button onClick={discover} style={{ padding: '8px 12px' }}>1. Discover</button>
          <button onClick={listServices} style={{ padding: '8px 12px' }}>2. List Services</button>
          <select value={service} onChange={(e) => setService(e.target.value)} disabled={!!token} style={{ padding: '8px' }}>
            <option value="tune-up">Tune-Up ($45)</option>
            <option value="flat-tire">Flat Tire ($20)</option>
            <option value="brake-bleed">Brake Bleed ($35)</option>
          </select>
          <button onClick={requestQuote} disabled={!!token} style={{ padding: '8px 12px', background: '#f59e0b', border: 'none' }}>3. Agent Request</button>
          <button onClick={approveQuote} disabled={!token} style={{ padding: '8px 12px', background: token ? '#16a34a' : '#ccc', color: '#fff', border: 'none' }}>4. Human Approve</button>
        </div>
        <div style={{ background: '#0f172a', color: '#38bdf8', padding: '12px', borderRadius: '8px', fontFamily: 'monospace', fontSize: '12px' }}>
          {logs.map((l, i) => <div key={i} style={{ marginBottom: '4px' }}>{l}</div>)}
        </div>
      </div>
    </div>
  );
}

