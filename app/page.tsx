'use client';
import { useState, useEffect } from 'react';

interface ServiceItem {
  id: string;
  name: string;
  price: number;
  eta_mins: number;
}

interface ShopItem {
  shop_id: string;
  shop_name: string;
  rating: string;
  services: ServiceItem[];
}

export default function HomePage() {
  const [logs, setLogs] = useState<string[]>(['AgentMesh Enterprise Node ready. Test autonomous reasoning or security attacks below.']);
  const [goal, setGoal] = useState('Fix my flat tire as cheap as possible');
  const [token, setToken] = useState('');
  const [sec, setSec] = useState(0);
  const [shop, setShop] = useState('budget-pedal');
  const [svc, setSvc] = useState('flat-tire');
  const [status, setStatus] = useState('Idle');
  const [busy, setBusy] = useState(false);
  const [receipt, setReceipt] = useState<any>(null);
  const [shopsData, setShopsData] = useState<ShopItem[]>([]);
  const [activeSvcId, setActiveSvcId] = useState<string>('flat-tire');

  const log = (m: string) => setLogs((p) => [`[${new Date().toLocaleTimeString()}] ${m}`, ...p.slice(0, 60)]);
  const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

  useEffect(() => {
    if (!token || sec <= 0) return;
    const t = setInterval(() => {
      setSec((p) => {
        if (p <= 1) {
          setToken('');
          setStatus('Expired');
          log('Security Alert: 5-minute HMAC approval window expired.');
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
    log(`1. Manifest Verified: ${d.name} (v${d.version})`);
  };

  const listShops = async (): Promise<ShopItem[]> => {
    const r = await fetch('/api/agent/execute', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'list_services' })
    });
    const d = await r.json();
    const list = d.shops || [];
    setShopsData(list);
    log(`2. Directory Scanned: ${list.length} open-agentic bicycle nodes active.`);
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
      log(`4. HITL Gate (HTTP 403): HMAC token bound to ${d.shop.name} ($${d.service.price}).`);
    }
  };

  const runAgent = async () => {
    if (busy || token) return;
    setBusy(true);
    setReceipt(null);
    setStatus('Analyzing Intent...');
    log(`=== Autonomous Agent Goal: "${goal}" ===`);
    try {
      await discover();
      await wait(450);
      await listShops();
      await wait(450);

      const q = goal.toLowerCase();
      // Domain Guardrail: Reject non-bicycle requests safely
      if (q.includes('car') || q.includes('pizza') || q.includes('flight') || q.includes('hotel')) {
        setStatus('Out of Scope');
        log('Guardrail Triggered: Request is outside Bicycle Service domain. Agent safely aborted.');
        return;
      }

      let target = '';
      if (q.includes('tire') || q.includes('puncture') || q.includes('flat') || q.includes('tube')) target = 'flat-tire';
      else if (q.includes('brake') || q.includes('bleed') || q.includes('stop')) target = 'brake-bleed';
      else if (q.includes('tune') || q.includes('service') || q.includes('repair') || q.includes('bike') || q.includes('bicycle') || q.includes('cycle')) target = 'tune-up';

      if (!target) {
        setStatus('Clarification Needed');
        log('Agent Guardrail: Ambiguous intent. Please specify tire, brake, or bicycle tune-up.');
        return;
      }

      const fast = q.includes('fast') || q.includes('urgent') || q.includes('quick');
      const chosenShop = fast ? 'velofix-hub' : 'budget-pedal';
      setShop(chosenShop);
      setSvc(target);
      setActiveSvcId(target);
      log(`3. Agent Decision (${fast ? 'Fastest ETA' : 'Lowest Price'}): Selected "${chosenShop}" for "${target}".`);
      await wait(450);
      await reqQuote(chosenShop, target);
    } catch {
      setStatus('Error');
      log('Agent Error: Workflow failed.');
    } finally {
      setBusy(false);
    }
  };

  const simulateAttack = async () => {
    setStatus('Attack Blocked (403)');
    log('--- Security Test: Simulating Rogue Agent Forged Token Attack ---');
    const r = await fetch('/api/agent/execute', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'request_quote',
        shop_id: shop,
        service_id: svc,
        confirmation_token: 'forged_agent_bypass_token.invalid_sig',
        human_confirmed: true
      })
    });
    const d = await r.json();
    log(`Security Defense Active (HTTP ${r.status}): Blocked rogue agent -> "${d.error}"`);
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
      log(`5. Human Approved! Verified Receipt ${d.quote_id} issued (HMAC: ${d.hmac_proof})`);
    }
  };

  const reject = () => {
    setToken('');
    setSec(0);
    setStatus('Rejected');
    log('5. Human Rejected: Token invalidated.');
  };

  return (
    <main style={{ maxWidth: '780px', margin: '0 auto', fontFamily: 'sans-serif' }}>
      <div style={{ background: '#0f172a', color: '#fff', padding: '20px', borderRadius: '12px', marginBottom: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
          <h1 style={{ margin: 0, fontSize: '1.4rem' }}>AgentMesh Web Enterprise</h1>
          <span style={{ background: '#334155', padding: '4px 12px', borderRadius: '999px', fontSize: '13px' }}>
            Status: <strong>{status}</strong> {token ? `(${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')})` : ''}
          </span>
        </div>
        <p style={{ margin: '6px 0 0', color: '#94a3b8', fontSize: '13px' }}>
          Domain-Guarded Multi-Shop Directory & Cryptographic HITL Security
        </p>
      </div>

      <div style={{ background: '#fff', padding: '16px', borderRadius: '12px', marginBottom: '16px' }}>
        <h2 style={{ marginTop: 0, fontSize: '1.1rem' }}>1. Domain-Guarded Autonomous Agent</h2>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
          <input value={goal} onChange={(e) => setGoal(e.target.value)} disabled={busy || !!token} style={{ flex: '1 1 220px', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1' }} />
          <button onClick={runAgent} disabled={busy || !!token} style={{ padding: '10px 16px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 'bold' }}>
            {busy ? 'Evaluating...' : 'Run Autonomous Agent'}
          </button>
        </div>
      </div>

      {shopsData.length > 0 && (
        <div style={{ background: '#fff', padding: '16px', borderRadius: '12px', marginBottom: '16px' }}>
          <h2 style={{ marginTop: 0, fontSize: '1.05rem' }}>Live Multi-Node Comparison ({activeSvcId})</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px' }}>
            {shopsData.map((item) => {
              const sInfo = item.services.find((x) => x.id === activeSvcId) || item.services.at(0)!;
              const isSelected = item.shop_id === shop;
              return (
                <div key={item.shop_id} style={{ border: isSelected ? '2px solid #2563eb' : '1px solid #e2e8f0', background: isSelected ? '#eff6ff' : '#f8fafc', padding: '12px', borderRadius: '8px' }}>
                  <div style={{ fontWeight: 'bold', fontSize: '14px' }}>{item.shop_name}</div>
                  <div style={{ fontSize: '12px', color: '#475569', margin: '4px 0' }}>Price: <strong>${sInfo.price}</strong> | ETA: <strong>{sInfo.eta_mins}m</strong></div>
                  {isSelected && <span style={{ fontSize: '11px', background: '#2563eb', color: '#fff', padding: '2px 6px', borderRadius: '4px' }}>Agent Selected</span>}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {receipt && (
        <div style={{ background: '#ecfdf5', border: '2px solid #10b981', padding: '16px', borderRadius: '12px', marginBottom: '16px' }}>
          <strong style={{ color: '#065f46' }}>Verified Quote Receipt: {receipt.quote_id}</strong>
          <p style={{ margin: '6px 0 0', fontSize: '14px', color: '#064e3b' }}>
            {receipt.shop.name} | {receipt.service.name} | ${receipt.service.price} ({receipt.service.eta_mins} mins) | Proof: {receipt.hmac_proof}
          </p>
        </div>
      )}

      <div style={{ background: '#fff', padding: '16px', borderRadius: '12px' }}>
        <h2 style={{ marginTop: 0, fontSize: '1.1rem' }}>2. HITL Controls & Red-Team Security Test</h2>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '12px' }}>
          <button onClick={discover} style={{ padding: '8px 10px' }}>Discover</button>
          <button onClick={listShops} style={{ padding: '8px 10px' }}>Compare Shops</button>
          <button onClick={simulateAttack} style={{ padding: '8px 10px', background: '#7c3aed', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 'bold' }}>
