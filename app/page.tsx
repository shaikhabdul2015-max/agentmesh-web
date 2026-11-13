'use client';
import { useState, useEffect } from 'react';

export default function HomePage() {
  const [logs, setLogs] = useState<string[]>(['AgentMesh Pro ready. Enter a goal to compare 3 shops.']);
  const [goal, setGoal] = useState('Fix my flat tire as cheap as possible');
  const [token, setToken] = useState('');
  const [sec, setSec] = useState(0);
  const [shop, setShop] = useState('budget-pedal');
  const [svc, setSvc] = useState('flat-tire');
  const [status, setStatus] = useState('Idle');
  const [busy, setBusy] = useState(false);
  const [receipt, setReceipt] = useState<any>(null);

  const log = (m: string) => setLogs((p) => [`[${new Date().toLocaleTimeString()}] ${m}`, ...p.slice(0, 50)]);
  const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

  useEffect(() => {
    if (!token || sec <= 0) return;
    const t = setInterval(() => {
      setSec((p) => {
        if (p <= 1) {
          setToken('');
          setStatus('Expired');
          return 0;
        }
        return p - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [token, sec]);

  const discover = async () => {
    const r = await fetch('/.well-known/agent.json');
    const d = await r.json();
    log(`1. Manifest Verified: ${d.name}`);
  };

  const listShops = async () => {
    const r = await fetch('/api/agent/execute', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'list_services' })
    });
    const d = await r.json();
    const list = d.shops || [];
    log(`2. Directory Scanned: ${list.length} bicycle shops found.`);
    return list;
  };

  const reqQuote = async (sh: string, sv: string) => {
    const r = await fetch('/api/agent/execute', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'request_quote', shop_id: sh, service_id: sv })
    });
    const d = await r.json();
    if (d.confirmation_token) {
      setToken(d.confirmation_token);
      setSec(300);
      setStatus('Pending Approval');
      log(`4. HITL Gate (HTTP 403): HMAC token issued for ${d.shop.name} ($${d.service.price}).`);
    }
  };

  const runAgent = async () => {
    if (busy || token) return;
    setBusy(true);
    setReceipt(null);
    setStatus('Comparing Shops...');
    log(`=== Autonomous Agent Goal: "${goal}" ===`);
    try {
      await discover();
      await wait(500);
      const shops = await listShops();
      await wait(500);

      const q = goal.toLowerCase();
      let target = 'tune-up';
      if (q.includes('tire') || q.includes('puncture') || q.includes('flat')) target = 'flat-tire';
      else if (q.includes('brake') || q.includes('bleed')) target = 'brake-bleed';

      const fast = q.includes('fast') || q.includes('urgent') || q.includes('quick');
      const chosenShop = fast ? 'velofix-hub' : 'budget-pedal';
      setShop(chosenShop);
      setSvc(target);
      log(`3. Agent Reasoning (${fast ? 'Fastest' : 'Cheapest'}): Selected "${chosenShop}" for "${target}".`);
      await wait(500);
      await reqQuote(chosenShop, target);
    } catch {
      setStatus('Error');
      log('Agent Error: Workflow failed.');
    } finally {
      setBusy(false);
    }
  };

  const approve = async () => {
    const r = await fetch('/api/agent/execute', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'request_quote', shop_id: shop, service_id: svc, confirmation_token: token, human_confirmed: true })
    });
    const d = await r.json();
    setToken('');
    setSec(0);
    if (r.ok) {
      setStatus('Approved');
      setReceipt(d);
      log(`5. Approved! Receipt ${d.quote_id} issued (HMAC: ${d.hmac_proof})`);
    }
  };

  const reject = () => {
    setToken('');
    setSec(0);
    setStatus('Rejected');
    log('5. Human Rejected: Token invalidated.');
  };

  return (
    <main style={{ maxWidth: '760px', margin: '0 auto', fontFamily: 'sans-serif' }}>
      <div style={{ background: '#0f172a', color: '#fff', padding: '20px', borderRadius: '12px', marginBottom: '16px' }}>
        <h1 style={{ margin: 0, fontSize: '1.4rem' }}>AgentMesh Web Pro</h1>
        <p style={{ margin: '6px 0 0', color: '#94a3b8', fontSize: '14px' }}>
          Status: <strong>{status}</strong> {token ? `(${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')})` : ''}
        </p>
      </div>

      <div style={{ background: '#fff', padding: '16px', borderRadius: '12px', marginBottom: '16px' }}>
        <h2 style={{ marginTop: 0, fontSize: '1.1rem' }}>1. Autonomous Multi-Shop AI Agent</h2>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
          <input value={goal} onChange={(e) => setGoal(e.target.value)} disabled={busy || !!token} style={{ flex: '1 1 220px', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1' }} />
          <button onClick={runAgent} disabled={busy || !!token} style={{ padding: '10px 16px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 'bold' }}>
            {busy ? 'Working...' : 'Run Autonomous Agent'}
          </button>
        </div>
      </div>

      {receipt && (
        <div style={{ background: '#ecfdf5', border: '2px solid #10b981', padding: '16px', borderRadius: '12px', marginBottom: '16px' }}>
          <strong style={{ color: '#065f46' }}>Verified Quote Receipt: {receipt.quote_id}</strong>
          <p style={{ margin: '6px 0 0', fontSize: '14px', color: '#064e3b' }}>
            {receipt.shop.name} | {receipt.service.name} | ${receipt.service.price} ({receipt.service.eta_mins} mins) | Proof: {receipt.hmac_proof}
          </p>
        </div>
      )}

      <div style={{ background: '#fff', padding: '16px', borderRadius: '12px' }}>
        <h2 style={{ marginTop: 0, fontSize: '1.1rem' }}>2. Manual Override & HITL Gate</h2>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '12px' }}>
          <button onClick={discover} style={{ padding: '8px 12px' }}>Discover</button>
          <button onClick={listShops} style={{ padding: '8px 12px' }}>List Shops</button>
          <select value={shop} onChange={(e) => setShop(e.target.value)} disabled={!!token} style={{ padding: '8px' }}>
            <option value="velofix-hub">VeloFix Express (Fastest)</option>
            <option value="metro-cycle">Metro Cycle Care (Balanced)</option>
            <option value="budget-pedal">Budget Pedal Works (Cheapest)</option>
          </select>
          <select value={svc} onChange={(e) => setSvc(e.target.value)} disabled={!!token} style={{ padding: '8px' }}>
            <option value="tune-up">Full Tune-Up</option>
            <option value="flat-tire">Flat Tire</option>
            <option value="brake-bleed">Brake Bleed</option>
          </select>
          <button onClick={() => reqQuote(shop, svc)} disabled={!!token} style={{ padding: '8px 12px', background: '#f59e0b', border: 'none', fontWeight: 'bold' }}>Request Quote</button>
          <button onClick={approve} disabled={!token} style={{ padding: '8px 12px', background: token ? '#16a34a' : '#ccc', color: '#fff', border: 'none', fontWeight: 'bold' }}>Human Approve</button>
          {token && <button onClick={reject} style={{ padding: '8px 12px', background: '#dc2626', color: '#fff', border: 'none', fontWeight: 'bold' }}>Reject</button>}
        </div>
        <div style={{ background: '#0f172a', color: '#38bdf8', padding: '12px', borderRadius: '8px', fontFamily: 'monospace', fontSize: '12px', maxHeight: '220px', overflowY: 'auto' }}>
          {logs.map((l, i) => <div key={i} style={{ marginBottom: '4px' }}>{l}</div>)}
        </div>
      </div>
    </main>
  );
}
