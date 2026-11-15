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
  const [limit, setLimit] = useState(0);
  const [disc, setDisc] = useState(0);

  function addLog(m: string) {
    setLogs((p) => ['[' + new Date().toLocaleTimeString() + '] ' + m, ...p.slice(0, 40)]);
  }

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

  async function callApi(payload: any) {
    const r = await fetch('/api/agent/execute', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await r.json();
    return { ok: r.ok, status: r.status, data };
  }

  async function discover() {
    const r = await fetch('/.well-known/agent.json');
    const d = await r.json();
    setRaw(d);
    addLog('1. Manifest: ' + d.name);
  }

  async function inspectFile(path: string) {
    const r = await fetch(path);
    const isJson = r.headers.get('content-type')?.includes('application/json');
    const data = isJson ? await r.json() : { file: path, content: await r.text() };
    setRaw(data);
    setShowRaw(true);
    addLog('Standard Loaded: ' + path);
  }

  async function approveQuote(tk: string, sh: string, sv: string) {
    const res = await callApi({ action: 'request_quote', shop_id: sh, service_id: sv, confirmation_token: tk, human_confirmed: true });
    setRaw(res.data);
    setLastToken(tk);
    setToken('');
    setSec(0);
    if (res.ok) {
      setStatus('Approved');
      setReceipt(res.data);
      addLog('5. Approved! ' + res.data.quote_id + ' ($' + res.data.service?.price + ')');
    }
  }

  async function runAgent(customGoal?: string) {
    const active = customGoal ?? goal;
    if (busy || token) return;
    setBusy(true);
    setReceipt(null);
    setShops([]);
    setGuard('');
    setDisc(0);
    setStatus('Evaluating...');
    addLog('=== Goal: "' + active + '" ===');

    await discover();
    const q = active.toLowerCase();
    if (q.includes('car') || q.includes('pizza') || q.includes('flight') || q.includes('hotel')) {
      setStatus('Guardrail Blocked');
      const msg = 'Out-of-Scope: "' + active + '" is not a bicycle repair request.';
      setGuard(msg);
      setRaw({ status: 'blocked', reason: msg });
      addLog('Guardrail: ' + msg);
      setBusy(false);
      return;
    }

    const d1 = await callApi({ action: 'list_services' });
    setShops(d1.data.shops || []);
    addLog('2. Scanned bicycle nodes.');

    const target = q.includes('tire') || q.includes('flat') ? 'flat-tire' : q.includes('brake') ? 'brake-bleed' : 'tune-up';
    const fast = q.includes('fast') || q.includes('urgent');
    const chosen = fast ? 'velofix-hub' : 'budget-pedal';
    setShop(chosen);
    setSvc(target);
    addLog('3. Picked ' + chosen + ' for ' + target);

    const d2 = await callApi({ action: 'request_quote', shop_id: chosen, service_id: target });
    setRaw(d2.data);

    if (d2.data.confirmation_token) {
      const price = Number(d2.data.service?.price || 0);
      if (limit > 0 && price <= limit) {
        addLog('Auto-Policy: Price within limit. Auto-approving...');
        await approveQuote(d2.data.confirmation_token, chosen, target);
      } else {
        setToken(d2.data.confirmation_token);
        setSec(300);
        setStatus('Pending Approval');
        addLog('4. HITL Gate (403): Token issued for ' + d2.data.shop.name);
      }
    }
    setBusy(false);
  }

  async function negotiate() {
    if (!token || disc > 0) return;
    addLog('A2A Agent: Negotiating 15% discount with server...');
    const res = await callApi({ action: 'request_quote', shop_id: shop, service_id: svc, discount_percent: 15 });
    setRaw(res.data);
    if (res.data.confirmation_token) {
      setToken(res.data.confirmation_token);
      setSec(300);
      setDisc(15);
      addLog('A2A Deal: Server signed 15% discounted token ($' + res.data.service?.price + ')!');
    }
  }

  async function spoof() {
    setGuard('');
    setStatus('Attack Blocked (403)');
    const res = await callApi({ action: 'request_quote', shop_id: shop, service_id: svc, confirmation_token: 'forged.sig', human_confirmed: true });
    setRaw(res.data);
    addLog('Security (403): Blocked rogue agent');
  }

  async function replay() {
    if (!lastToken) return;
    setStatus('Replay Blocked (409)');
    const res = await callApi({ action: 'request_quote', shop_id: shop, service_id: svc, confirmation_token: lastToken, human_confirmed: true });
    setRaw(res.data);
    setShowRaw(true);
    addLog('Replay Guard (HTTP ' + res.status + '): ' + (res.data.error || 'Blocked reused token'));
  }

  return (
    <div style={{ maxWidth: '760px', margin: '0 auto', padding: '12px', fontFamily: 'sans-serif', background: '#f1f5f9', minHeight: '100vh' }}>
      <div style={{ background: '#0f172a', color: '#fff', padding: '16px', borderRadius: '12px', marginBottom: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.3rem' }}>AgentMesh Web Ultra</h1>
          <p style={{ margin: '4px 0 0', color: '#94a3b8', fontSize: '13px' }}>
            Status: <strong>{status}</strong> {token ? '(' + Math.floor(sec / 60) + ':' + String(sec % 60).padStart(2, '0') + ')' : ''}
          </p>
        </div>
        <div style={{ background: '#1e293b', padding: '8px 12px', borderRadius: '8px', fontSize: '12px' }}>
          <div style={{ color: '#38bdf8', fontWeight: 600 }}>Auto-Approve Limit: ${limit}</div>
          <input type="range" min="0" max="50" step="5" value={limit} onChange={(e) => setLimit(Number(e.target.value))} style={{ width: '130px' }} />
        </div>
      </div>

      <div style={{ background: '#fff', padding: '14px', borderRadius: '12px', marginBottom: '12px' }}>
        <div style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>
          <input value={goal} onChange={(e) => setGoal(e.target.value)} style={{ flex: 1, padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px' }} />
          <button onClick={() => runAgent()} disabled={busy || Boolean(token)} style={{ padding: '10px 16px', borderRadius: '8px', border: 'none', background: '#2563eb', color: '#fff', fontWeight: 600 }}>Run Agent</button>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
          <button onClick={() => { setGoal('Fix my flat tire as cheap as possible'); runAgent('Fix my flat tire as cheap as possible'); }} style={{ padding: '5px 10px', borderRadius: '999px', border: '1px solid #e2e8f0', background: '#f8fafc', fontSize: '12px' }}>Cheapest Tire ($15)</button>
          <button onClick={() => { setGoal('Need fastest brake bleed urgently'); runAgent('Need fastest brake bleed urgently'); }} style={{ padding: '5px 10px', borderRadius: '999px', border: '1px solid #e2e8f0', background: '#f8fafc', fontSize: '12px' }}>Fastest Brake (45m)</button>
          <button onClick={() => { setGoal('Book a car oil change'); runAgent('Book a car oil change'); }} style={{ padding: '5px 10px', borderRadius: '999px', border: '1px solid #fecaca', background: '#fef2f2', color: '#b91c1c', fontSize: '12px' }}>Test Car Guardrail</button>
        </div>
      </div>

      {guard && <div style={{ background: '#fef2f2', border: '1px solid #ef4444', color: '#991b1b', padding: '12px', borderRadius: '10px', marginBottom: '12px', fontSize: '13px' }}><strong>Guardrail:</strong> {guard}</div>}

      {shops.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '12px' }}>
          {shops.map((s) => {
            const list = Array.isArray(s.services) ? s.services : [];
            const item = list.find((x: any) => x.id === svc) || list[0];
            const id = s.shop_id || s.id;
            const name = s.shop_name || s.name;
            const sel = id === shop;
            const p = sel && disc > 0 ? Math.round((item?.price || 0) * 0.85) : item?.price;
            return (
              <div key={id} onClick={() => setShop(id)} style={{ background: sel ? '#eff6ff' : '#fff', border: sel ? '2px solid #2563eb' : '1px solid #e2e8f0', padding: '12px', borderRadius: '10px' }}>
                <div style={{ fontWeight: 700, fontSize: '14px' }}>{name}</div>
                <div style={{ fontSize: '13px', color: '#475569' }}>${p} {sel && disc > 0 ? '(15% off)' : ''} | {item?.eta_mins}m {sel ? '✓' : ''}</div>
              </div>
            );
          })}
        </div>
      )}

      {receipt && (
        <div style={{ background: '#ecfdf5', border: '2px solid #10b981', padding: '14px', borderRadius: '12px', marginBottom: '12px' }}>
          <div style={{ fontWeight: 700, color: '#065f46', fontSize: '15px' }}>Verified Receipt: {receipt.quote_id}</div>
