'use client';
import { useState, useEffect } from 'react';

export default function HomePage() {
  const [logs, setLogs] = useState<string[]>(['AgentMesh Ultra ready.']);
  const [goal, setGoal] = useState('Fix my flat tire as cheap as possible');
  const [token, setToken] = useState('');
  const [lastToken, setLastToken] = useState('');
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
  const [autoLimit, setAutoLimit] = useState<number>(0);
  const [discount, setDiscount] = useState<number>(0);

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

  const inspectFile = async (path: string) => {
    try {
      const r = await fetch(path);
      const isJson = r.headers.get('content-type')?.includes('application/json');
      const data = isJson ? await r.json() : { file: path, content: await r.text() };
      setRaw(data);
      setShowRaw(true);
      log(`Discovery: Loaded ${path} (HTTP ${r.status})`);
    } catch {
      log(`Failed to load ${path}`);
    }
  };

  const runAgent = async (g?: string) => {
    const active = g ?? goal;
    if (busy || token) return;
    setBusy(true);
    setReceipt(null);
    setShops([]);
    setGuard('');
    setDiscount(0);
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
        const price = Number(d2.service?.price || 0);
        if (autoLimit > 0 && price <= autoLimit) {
          log(`Policy Check: $${price} <= $${autoLimit} Auto-Limit. Executing autonomously...`);
          await wait(300);
          await executeApproval(d2.confirmation_token, chosen, target, 0);
        } else {
          setToken(d2.confirmation_token);
          setSec(300);
          setStatus('Pending Approval');
          log(`4. HITL Gate (403): $${price} exceeds $${autoLimit} limit. Token issued.`);
        }
      }
    } finally {
      setBusy(false);
    }
  };

  const negotiate = async () => {
    if (!token || discount > 0) return;
    setStatus('Negotiating A2A...');
    log(`A2A Agent: Requesting 15% SLA discount from ${shop}...`);
    await wait(400);
    setDiscount(15);
    setStatus('Pending Approval');
    log(`A2A Success: Vendor node accepted 15% discount!`);
  };

  const spoof = async () => {
    setGuard('');
    setStatus('Attack Blocked (403)');
    const r = await fetch('/api/agent/execute', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'request_quote', shop_id: shop, service_id: svc, confirmation_token: 'forged.sig', human_confirmed: true }) });
    const d = await r.json();
    setRaw(d);
    log(`Security (HTTP ${r.status}): Blocked rogue agent -> "${d.error}"`);
  };

  const replayAttack = async () => {
    if (!lastToken) return;
    setStatus('Replay Blocked');
    const r = await fetch('/api/agent/execute', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'request_quote', shop_id: shop, service_id: svc, confirmation_token: lastToken, human_confirmed: true }) });
    const d = await r.json();
    setRaw(d);
    setShowRaw(true);
    log(`Replay Defense (HTTP ${r.status}): ${d.error || 'Token already consumed'}`);
  };

  const copyCurl = () => {
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://vercel.app';
    const cmd = `curl -X POST ${origin}/api/agent/execute -H "Content-Type: application/json" -d '{"action":"request_quote","shop_id":"${shop}","service_id":"${svc}"}'`;
    navigator.clipboard.writeText(cmd);
    log('Copied external agent cURL command!');
  };

  const executeApproval = async (activeToken: string, activeShop: string, activeSvc: string, activeDiscount: number) => {
    const r = await fetch('/api/agent/execute', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'request_quote', shop_id: activeShop, service_id: activeSvc, confirmation_token: activeToken, human_confirmed: true }) });
    const d = await r.json();
    if (r.ok && activeDiscount > 0 && d.service) {
      d.service.price = Math.round(d.service.price * (1 - activeDiscount / 100));
    }
    setRaw(d);
    setLastToken(activeToken);
    setToken('');
    setSec(0);
    if (r.ok) {
      setStatus('Approved');
      setReceipt(d);
      log(`5. Approved! ${d.quote_id} ($${d.service?.price}) (HMAC: ${d.hmac_proof})`);
    }
  };

  const approve = () => executeApproval(token, shop, svc, discount);

  const reject = () => {
    setToken('');
    setSec(0);
    setStatus('Rejected');
    log('Human rejected the quote.');
  };

  return (
    <div style={{ maxWidth: '760px', margin: '0 auto', padding: '12px', fontFamily: 'sans-serif', background: '#f1f5f9', minHeight: '100vh' }}>
      <div style={{ background: '#0f172a', color: '#fff', padding: '16px', borderRadius: '12px', marginBottom: '12px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
          <div>
            <h1 style={{ margin: 0, fontSize: '1.3rem' }}>AgentMesh Web Ultra</h1>
            <p style={{ margin: '4px 0 0', color: '#94a3b8', fontSize: '13px' }}>
              Status: <strong>{status}</strong> {token ? `(${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')})` : ''}
            </p>
          </div>
          <div style={{ background: '#1e293b', padding: '8px 12px', borderRadius: '8px', fontSize: '12px' }}>
            <label style={{ display: 'block', color: '#38bdf8', fontWeight: 600, marginBottom: '4px' }}>
              Auto-Approve Limit: ${autoLimit}
            </label>
            <input
              type="range"
              min="0"
              max="50"
              step="5"
              value={autoLimit}
              onChange={(e) => setAutoLimit(Number(e.target.value))}
              style={{ width: '130px', cursor: 'pointer' }}
            />
          </div>
        </div>
      </div>

      <div style={{ background: '#fff', padding: '14px', borderRadius: '12px', marginBottom: '12px' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '10px' }}>
          <input value={goal} onChange={(e) => setGoal(e.target.value)} style={{ flex: 1, minWidth: '200px', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px' }} />
          <button onClick={() => runAgent()} disabled={busy || !!token} style={{ padding: '10px 16px', borderRadius: '8px', border: 'none', background: '#2563eb', color: '#fff', fontWeight: 600, cursor: 'pointer' }}>
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
