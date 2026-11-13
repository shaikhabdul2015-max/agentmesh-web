'use client';
import { useState, useEffect } from 'react';

export default function HomePage() {
  const [logs, setLogs] = useState<string[]>(['AgentMesh Enterprise ready. Test autonomous reasoning or spoof attacks.']);
  const [goal, setGoal] = useState('Fix my flat tire as cheap as possible');
  const [token, setToken] = useState('');
  const [sec, setSec] = useState(0);
  const [shop, setShop] = useState('budget-pedal');
  const [svc, setSvc] = useState('flat-tire');
  const [status, setStatus] = useState('Idle');
  const [busy, setBusy] = useState(false);
  const [receipt, setReceipt] = useState<any>(null);
  const [shops, setShops] = useState<any[]>([]);

  const log = (m: string) => setLogs((p) => [`[${new Date().toLocaleTimeString()}] ${m}`, ...p.slice(0, 50)]);
  const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

  useEffect(() => {
    if (!token || sec <= 0) return;
    const t = setInterval(() => setSec((p) => (p <= 1 ? (setToken(''), setStatus('Expired'), 0) : p - 1)), 1000);
    return () => clearInterval(t);
  }, [token, sec]);

  const discover = async () => {
    const d = await (await fetch('/.well-known/agent.json')).json();
    log(`1. Manifest Verified: ${d.name}`);
  };

  const listShops = async () => {
    const d = await (await fetch('/api/agent/execute', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'list_services' }) })).json();
    setShops(d.shops || []);
    log(`2. Directory Scanned: ${(d.shops || []).length} bicycle nodes active.`);
  };

  const reqQuote = async (sh: string, sv: string) => {
    const d = await (await fetch('/api/agent/execute', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'request_quote', shop_id: sh, service_id: sv }) })).json();
    if (d.confirmation_token) {
      setToken(d.confirmation_token);
      setSec(300);
      setStatus('Pending Approval');
      log(`4. HITL Gate (HTTP 403): HMAC token bound to ${d.shop.name} ($${d.service.price}).`);
    }
  };

  const runAgent = async () => {
    if (busy || token) return;
    setBusy(true);
    setReceipt(null);
    setStatus('Evaluating...');
    log(`=== Autonomous Agent Goal: "${goal}" ===`);
    try {
      await discover();
      await wait(400);
      await listShops();
      await wait(400);
      const q = goal.toLowerCase();
      if (q.includes('car') || q.includes('pizza') || q.includes('flight')) {
        setStatus('Out of Scope');
        log('Guardrail Blocked: Request outside Bicycle Service domain.');
        return;
      }
      const target = q.includes('tire') || q.includes('flat') || q.includes('puncture') ? 'flat-tire' : q.includes('brake') || q.includes('bleed') ? 'brake-bleed' : 'tune-up';
      const fast = q.includes('fast') || q.includes('urgent') || q.includes('quick');
      const chosen = fast ? 'velofix-hub' : 'budget-pedal';
      setShop(chosen);
      setSvc(target);
      log(`3. Agent Reasoning (${fast ? 'Fastest' : 'Cheapest'}): Picked "${chosen}" for "${target}".`);
      await wait(400);
      await reqQuote(chosen, target);
    } finally {
      setBusy(false);
    }
  };

  const spoofAttack = async () => {
    setStatus('Attack Blocked (403)');
    const r = await fetch('/api/agent/execute', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'request_quote', shop_id: shop, service_id: svc, confirmation_token: 'forged.sig', human_confirmed: true }) });
    const d = await r.json();
    log(`Security Defense (HTTP ${r.status}): Blocked rogue agent -> "${d.error}"`);
  };

  const approve = async () => {
    const r = await fetch('/api/agent/execute', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'request_quote', shop_id: shop, service_id: svc, confirmation_token: token, human_confirmed: true }) });
    const d = await r.json();
    setToken('');
    setSec(0);
    if (r.ok) {
      setStatus('Approved');
      setReceipt(d);
      log(`5. Approved! Receipt ${d.quote_id} (HMAC: ${d.hmac_proof})`);
    }
  };

  return (
    <main style={{ maxWidth: '760px', margin: '0 auto', fontFamily: 'sans-serif' }}>
      <div style={{ background: '#0f172a', color: '#fff', padding: '18px', borderRadius: '12px', marginBottom: '14px' }}>
        <h1 style={{ margin: 0, fontSize: '1.35rem' }}>AgentMesh Web Enterprise</h1>
        <p style={{ margin: '6px 0 0', color: '#94a3b8', fontSize: '13px' }}>Status: <strong>{status}</strong> {token ? `(${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')})` : ''}</p>
      </div>

      <div style={{ background: '#fff', padding: '14px', borderRadius: '12px', marginBottom: '14px' }}>
        <h2 style={{ marginTop: 0, fontSize: '1.05rem' }}>1. Domain-Guarded Autonomous Agent</h2>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
          <input value={goal} onChange={(e) => setGoal(e.target.value)} disabled={busy || !!token} style={{ flex: '1 1 200px', padding: '9px', borderRadius: '6px', border: '1px solid #cbd5e1' }} />
          <button onClick={runAgent} disabled={busy || !!token} style={{ padding: '9px 14px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 'bold' }}>{busy ? 'Working...' : 'Run Autonomous Agent'}</button>
        </div>
      </div>

      {shops.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: '8px', marginBottom: '14px' }}>
          {shops.map((it) => {
            const sInfo = it.services.find((x: any) => x.id === svc) || it.services.at(0);
            const active = it.shop_id === shop;
            return (
              <div key={it.shop_id} style={{ background: active ? '#eff6ff' : '#fff', border: active ? '2px solid #2563eb' : '1px solid #cbd5e1', padding: '10px', borderRadius: '8px' }}>
                <strong style={{ fontSize: '13px' }}>{it.shop_name}</strong>
                <div style={{ fontSize: '12px', color: '#475569' }}>${sInfo.price} | {sInfo.eta_mins}m {active ? '✓ Selected' : ''}</div>
              </div>
            );
          })}
        </div>
      )}

      {receipt && (
        <div style={{ background: '#ecfdf5', border: '2px solid #10b981', padding: '14px', borderRadius: '12px', marginBottom: '14px' }}>
          <strong style={{ color: '#065f46' }}>Verified Receipt: {receipt.quote_id}</strong>
          <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#064e3b' }}>{receipt.shop.name} | {receipt.service.name} | ${receipt.service.price} | Proof: {receipt.hmac_proof}</p>
        </div>
      )}

      <div style={{ background: '#fff', padding: '14px', borderRadius: '12px' }}>
        <h2 style={{ marginTop: 0, fontSize: '1.05rem' }}>2. HITL Controls & Red-Team Security</h2>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '10px' }}>
          <button onClick={discover} style={{ padding: '7px 10px' }}>Discover</button>
          <button onClick={listShops} style={{ padding: '7px 10px' }}>Compare Shops</button>
          <button onClick={spoofAttack} style={{ padding: '7px 10px', background: '#7c3aed', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 'bold' }}>Simulate Spoof Attack</button>
          <button onClick={approve} disabled={!token} style={{ padding: '7px 12px', background: token ? '#16a34a' : '#ccc', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 'bold' }}>Human Approve</button>
          {token && <button onClick={() => { setToken(''); setSec(0); setStatus('Rejected'); log('5. Human Rejected.'); }} style={{ padding: '7px 10px', background: '#dc2626', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 'bold' }}>Reject</button>}
        </div>
        <div style={{ background: '#0f172a', color: '#38bdf8', padding: '10px', borderRadius: '8px', fontFamily: 'monospace', fontSize: '11px', maxHeight: '200px', overflowY: 'auto' }}>
          {logs.map((l, i) => <div key={i} style={{ marginBottom: '4px' }}>{l}</div>)}
        </div>
      </div>
    </main>
  );
}
