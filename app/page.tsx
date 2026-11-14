'use client';
import { useState, useEffect } from 'react';

export default function HomePage() {
  const [logs, setLogs] = useState<string[]>(['AgentMesh Ultra ready.']);
  const [goal, setGoal] = useState('Fix my flat tire as cheap as possible');
  const [token, setToken] = useState('');
  const [lastUsedToken, setLastUsedToken] = useState('');
  const [sec, setSec] = useState(0);
  const [shop, setShop] = useState('budget-pedal');
  const [svc, setSvc] = useState('flat-tire');
  const [status, setStatus] = useState('Idle');
  const [busy, setBusy] = useState(false);
  const [receipt, setReceipt] = useState<any>(null);
  const [shops, setShops] = useState<any[]>([]);
  const [guard, setGuard] = useState('');
  const [raw, setRaw] = useState<any>(null);
  const [showRaw, setShowRaw] = useState(false);

  const log = (m: string) => setLogs((p) => [`[${new Date().toLocaleTimeString()}] ${m}`, ...p.slice(0, 40)]);
  const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

  useEffect(() => {
    if (!token || sec <= 0) return;
    const t = setInterval(() => setSec((p) => (p <= 1 ? (setToken(''), setStatus('Expired'), 0) : p - 1)), 1000);
    return () => clearInterval(t);
  }, [token, sec]);

  const discover = async () => {
    const d = await (await fetch('/.well-known/agent.json')).json();
    setRaw(d);
    log(`1. Manifest: ${d.name}`);
  };

  // Step 1: Open Web Standards Live Inspector
  const inspectFile = async (path: string) => {
    try {
      const r = await fetch(path);
      const isJson = r.headers.get('content-type')?.includes('application/json');
      const data = isJson ? await r.json() : { file: path, content: await r.text() };
      setRaw(data);
      setShowRaw(true);
      log(`Discovery: Loaded ${path} (HTTP ${r.status})`);
    } catch {
      log(`Discovery Error: Could not load ${path}`);
    }
  };

  const runAgent = async (g?: string) => {
    const active = g ?? goal;
    if (busy || token) return;
    setBusy(true);
    setReceipt(null);
    setShops([]);
    setGuard('');
    setStatus('Evaluating...');
    log(`=== Goal: "${active}" ===`);
    try {
      await discover();
      await wait(300);
      const q = active.toLowerCase();
      if (q.includes('car') || q.includes('pizza') || q.includes('flight') || q.includes('hotel')) {
        setStatus('Guardrail Blocked');
        const msg = `Out-of-Scope: "${active}" is not a bicycle repair request.`;
        setGuard(msg);
        setRaw({ status: 'blocked', reason: msg });
        log(`Guardrail: ${msg}`);
        return;
      }
      const d1 = await (await fetch('/api/agent/execute', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'list_services' }) })).json();
      setShops(d1.shops || []);
      log(`2. Scanned ${(d1.shops || []).length} bicycle nodes.`);
      await wait(300);
      const target = q.includes('tire') || q.includes('flat') || q.includes('puncture') ? 'flat-tire' : q.includes('brake') || q.includes('bleed') ? 'brake-bleed' : 'tune-up';
      const fast = q.includes('fast') || q.includes('urgent') || q.includes('quick');
      const chosen = fast ? 'velofix-hub' : 'budget-pedal';
      setShop(chosen);
      setSvc(target);
      log(`3. Picked "${chosen}" (${fast ? 'Fastest' : 'Cheapest'}) for "${target}".`);
      await wait(300);
      const d2 = await (await fetch('/api/agent/execute', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'request_quote', shop_id: chosen, service_id: target }) })).json();
      setRaw(d2);
      if (d2.confirmation_token) {
        setToken(d2.confirmation_token);
        setSec(300);
        setStatus('Pending Approval');
        log(`4. HITL Gate (403): Token issued for ${d2.shop.name} ($${d2.service.price}).`);
      }
    } finally {
      setBusy(false);
    }
  };

  const spoof = async () => {
    setGuard('');
    setStatus('Attack Blocked (403)');
    const r = await fetch('/api/agent/execute', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'request_quote', shop_id: shop, service_id: svc, confirmation_token: 'forged.sig', human_confirmed: true }) });
    const d = await r.json();
    setRaw(d);
    log(`Security (HTTP ${r.status}): Blocked rogue agent -> "${d.error}"`);
  };

  // Step 2: Replay Attack Simulation
  const replayAttack = async () => {
    if (!lastUsedToken) return;
    setStatus('Replay Blocked');
    const r = await fetch('/api/agent/execute', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'request_quote', shop_id: shop, service_id: svc, confirmation_token: lastUsedToken, human_confirmed: true }) });
    const d = await r.json();
    setRaw(d);
    setShowRaw(true);
    log(`Replay Defense (HTTP ${r.status}): ${d.error || 'Token already consumed / invalid'}`);
  };

  // Step 3: Copy External Agent cURL
  const copyCurl = () => {
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://vercel.app';
    const cmd = `curl -X POST ${origin}/api/agent/execute -H "Content-Type: application/json" -d '{"action":"request_quote","shop_id":"${shop}","service_id":"${svc}"}'`;
    navigator.clipboard.writeText(cmd);
    log(`Copied external agent cURL command to clipboard!`);
  };

  const approve = async () => {
    const r = await fetch('/api/agent/execute', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'request_quote', shop_id: shop, service_id: svc, confirmation_token: token, human_confirmed: true }) });
    const d = await r.json();
    setRaw(d);
    setLastUsedToken(token);
    setToken('');
    setSec(0);
    if (r.ok) {
      setStatus('Approved');
      setReceipt(d);
      log(`5. Approved! ${d.quote_id} (HMAC: ${d.hmac_proof})`);
    }
  };

  const reject = () => {
    setToken('');
    setSec(0);
    setStatus('Rejected by Human');
    log('Human rejected the quote request.');
  };

  return (
    <main style={{ maxWidth: '760px', margin: '0 auto', padding: '12px', fontFamily: 'sans-serif', background: '#f1f5f9', minHeight: '100vh' }}>
      <div style={{ background: '#0f172a', color: '#fff', padding: '16px', borderRadius: '12px', marginBottom: '12px' }}>
        <h1 style={{ margin: 0, fontSize: '1.3rem' }}>AgentMesh Web Ultra</h1>
        <p style={{ margin: '4px 0 0', color: '#94a3b8', fontSize: '13px' }}>
          Status: <strong>{status}</strong> {token ? `(${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')})` : ''}
        </p>
      </div>

      <div style={{ background: '#fff', padding: '14px', borderRadius: '12px', marginBottom: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '10px' }}>
          <input
            value={goal}
            onChange={(e) => setGoal(e.target.value)}
            style={{ flex: 1, minWidth: '200px', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px' }}
          />
          <button
            onClick={() => runAgent()}
            disabled={busy || !!token}
            style={{ padding: '10px 16px', borderRadius: '8px', border: 'none', background: '#2563eb', color: '#fff', fontWeight: 600, cursor: 'pointer' }}
          >
            Run Agent
          </button>
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
          <button onClick={() => { setGoal('Fix my flat tire as cheap as possible'); runAgent('Fix my flat tire as cheap as possible'); }} style={{ padding: '5px 10px', borderRadius: '999px', border: '1px solid #e2e8f0', background: '#f8fafc', fontSize: '12px', cursor: 'pointer' }}>
            Cheapest Tire ($15)
          </button>
          <button onClick={() => { setGoal('Need fastest brake bleed urgently'); runAgent('Need fastest brake bleed urgently'); }} style={{ padding: '5px 10px', borderRadius: '999px', border: '1px solid #e2e8f0', background: '#f8fafc', fontSize: '12px', cursor: 'pointer' }}>
            Fastest Brake (45m)
          </button>
          <button onClick={() => { setGoal('Book a car oil change'); runAgent('Book a car oil change'); }} style={{ padding: '5px 10px', borderRadius: '999px', border: '1px solid #fecaca', background: '#fef2f2', color: '#b91c1c', fontSize: '12px', cursor: 'pointer' }}>
            Test Car Guardrail
          </button>
        </div>
      </div>

      {guard && (
        <div style={{ background: '#fef2f2', border: '1px solid #ef4444', color: '#991b1b', padding: '12px', borderRadius: '10px', marginBottom: '12px', fontSize: '13px' }}>
          <strong>Guardrail Triggered:</strong> {guard}
        </div>
      )}

      {shops.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '12px' }}>
          {shops.map((s) => {
            const item = s.services?.find((x: any) => x.id === svc) || s.services?.[0];
            const selected = s.id === shop;
            return (
              <div
                key={s.id}
                onClick={() => setShop(s.id)}
                style={{
                  background: selected ? '#eff6ff' : '#fff',
                  border: selected ? '2px solid #2563eb' : '1px solid #e2e8f0',
                  padding: '12px',
                  borderRadius: '10px',
                  cursor: 'pointer'
                }}
              >
                <div style={{ fontWeight: 700, fontSize: '14px', color: '#0f172a' }}>{s.name}</div>
                <div style={{ fontSize: '13px', color: '#475569', marginTop: '2px' }}>
                  ${item?.price} | {item?.eta_mins}m {selected ? '✓' : ''}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {receipt && (
