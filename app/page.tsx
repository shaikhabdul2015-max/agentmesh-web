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

interface QuoteReceipt {
  quote_id: string;
  hmac_proof: string;
  shop: { id: string; name: string; rating: string };
  service: ServiceItem;
  approved_at: string;
}

export default function HomePage() {
  const [logs, setLogs] = useState<string[]>(['AgentMesh Pro Inspector ready. Enter a goal to compare 3 local shops.']);
  const [goal, setGoal] = useState('Fix my flat tire as cheap as possible');
  const [token, setToken] = useState('');
  const [secondsLeft, setSecondsLeft] = useState<number>(0);
  const [selectedShop, setSelectedShop] = useState('metro-cycle');
  const [selectedService, setSelectedService] = useState('flat-tire');
  const [status, setStatus] = useState('Idle');
  const [running, setRunning] = useState(false);
  const [receipt, setReceipt] = useState<QuoteReceipt | null>(null);

  const log = (m: string) => setLogs((p) => [`[${new Date().toLocaleTimeString()}] ${m}`, ...p.slice(0, 60)]);
  const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

  useEffect(() => {
    if (!token || secondsLeft <= 0) return;
    const t = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          setToken('');
          setStatus('Token Expired');
          log('Security Alert: 5-minute HMAC approval window expired.');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [token, secondsLeft]);

  const discover = async () => {
    const r = await fetch('/.well-known/agent.json');
    const d = await r.json();
    log(`1. Manifest Verified: ${d.name} (v${d.version})`);
  };

  const fetchDirectory = async (): Promise<ShopItem[]> => {
    const r = await fetch('/api/agent/execute', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'list_services' })
    });
    const d = await r.json();
    const shopsList: ShopItem[] = d.shops || [];
    log(`2. Directory Scanned: Found ${shopsList.length} open-agentic bicycle shops.`);
    return shopsList;
  };

  const requestQuote = async (shopId: string, serviceId: string) => {
    const r = await fetch('/api/agent/execute', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'request_quote', shop_id: shopId, service_id: serviceId })
    });
    const d = await r.json();
    if (d.confirmation_token) {
      setToken(d.confirmation_token);
      setSecondsLeft(300);
      setStatus('Pending Human Approval');
      log(`4. HITL Gate Active (HTTP 403): Bound HMAC token issued for ${d.shop.name} -> ${d.service.name} ($${d.service.price}).`);
    } else if (d.error) {
      log(`API Error: ${d.error}`);
    }
  };

  const runAutonomousAgent = async () => {
    if (running || token) return;
    setRunning(true);
    setReceipt(null);
    setStatus('Agent Comparing Shops...');
    log(`=== Autonomous Agent Started | Goal: "${goal}" ===`);
    try {
      await discover();
      await sleep(600);
      const shops = await fetchDirectory();
      if (!shops.length) throw new Error('No shops returned');
      await sleep(600);

      const q = goal.toLowerCase();
      let targetSvc = 'tune-up';
      if (q.includes('tire') || q.includes('puncture') || q.includes('flat')) targetSvc = 'flat-tire';
      else if (q.includes('brake') || q.includes('bleed')) targetSvc = 'brake-bleed';

      const preferFast = q.includes('fast') || q.includes('urgent') || q.includes('quick');
      let bestShop = shops[0];
      let bestService = shops[0].services.find((s) => s.id === targetSvc)!;

      for (const s of shops) {
        const svc = s.services.find((item) => item.id === targetSvc)!;
        if (preferFast ? svc.eta_mins < bestService.eta_mins : svc.price < bestService.price) {
          bestShop = s;
          bestService = svc;
        }
      }

      setSelectedShop(bestShop.shop_id);
      setSelectedService(targetSvc);
      log(
        `3. Agent Decision (${preferFast ? 'Fastest ETA' : 'Lowest Price'}): Selected "${bestShop.shop_name}" ($${bestService.price}, ${bestService.eta_mins} mins) over ${shops.length - 1} other shops.`
      );
      await sleep(600);
      await requestQuote(bestShop.shop_id, targetSvc);
    } catch {
      setStatus('Error');
      log('Agent Error: Could not complete multi-shop evaluation.');
    } finally {
      setRunning(false);
    }
  };

  const approveQuote = async () => {
    const r = await fetch('/api/agent/execute', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'request_quote',
        shop_id: selectedShop,
        service_id: selectedService,
        confirmation_token: token,
        human_confirmed: true
      })
    });
    const d = await r.json();
    setToken('');
    setSecondsLeft(0);
    if (r.ok) {
      setStatus('Approved');
      setReceipt(d);
      log(`5. Human Approved! Verified Receipt ${d.quote_id} issued with HMAC proof ${d.hmac_proof}`);
    } else {
      setStatus('Rejected');
      log(`Error: ${d.error}`);
    }
  };

  const rejectQuote = () => {
    setToken('');
    setSecondsLeft(0);
    setStatus('Rejected');
    log('5. Human Rejected: Quote cancelled and token invalidated.');
  };

  const formatTime = (sec: number) => `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`;

  return (
    <div style={{ maxWidth: '780px', margin: '0 auto', fontFamily: 'system-ui, sans-serif' }}>
      <div style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)', color: '#fff', padding: '20px', borderRadius: '12px', marginBottom: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
          <h1 style={{ margin: 0, fontSize: '1.5rem' }}>AgentMesh Web Pro</h1>
          <span style={{ background: '#334155', padding: '4px 12px', borderRadius: '999px', fontSize: '13px' }}>
            Status: <strong>{status}</strong> {token && `(${formatTime(secondsLeft)})`}
          </span>
        </div>
        <p style={{ margin: '6px 0 0', color: '#94a3b8', fontSize: '14px' }}>
          Multi-Node Open Agentic Service Directory & Cryptographic HITL Protocol
        </p>
      </div>

      <div style={{ background: '#fff', padding: '16px', borderRadius: '12px', marginBottom: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
        <h2 style={{ marginTop: 0, fontSize: '1.1rem' }}>1. Autonomous Multi-Shop AI Agent</h2>
        <p style={{ fontSize: '13px', color: '#475569', marginTop: 0 }}>
          Try goals like <em>"Fix my flat tire as cheap as possible"</em> or <em>"Urgent hydraulic brake bleed"</em>. The agent compares 3 local shops and stops at the HITL gate.
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
          <input
            type="text"
            value={goal}
            onChange={(e) => setGoal(e.target.value)}
            disabled={running || !!token}
            style={{ flex: '1 1 250px', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
          />
          <button
            onClick={runAutonomousAgent}
            disabled={running || !!token}
            style={{ padding: '10px 16px', background: running || token ? '#94a3b8' : '#2563eb', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: running || token ? 'not-allowed' : 'pointer' }}
          >
            {running ? 'Comparing Nodes...' : 'Run Autonomous Agent'}
          </button>
        </div>
      </div>

      {receipt && (
        <div style={{ background: '#ecfdf5', border: '2px solid #10b981', padding: '16px', borderRadius: '12px', marginBottom: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <strong style={{ color: '#065f46', fontSize: '1.05rem' }}>Verified Agentic Quote Receipt</strong>
            <span style={{ background: '#10b981', color: '#fff', padding: '2px 8px', borderRadius: '6px', fontSize: '12px', fontWeight: 'bold' }}>
              {receipt.quote_id}
            </span>
          </div>
          <p style={{ margin: '8px 0 4px', fontSize: '14px', color: '#064e3b' }}>
            <strong>Shop:</strong> {receipt.shop.name} ({receipt.shop.rating}) | <strong>Service:</strong> {receipt.service.name}
          </p>
          <p style={{ margin: 0, fontSize: '13px', color: '#047857' }}>
            <strong>Total:</strong> ${receipt.service.price} | <strong>ETA:</strong> {receipt.service.eta_mins} mins | <strong>HMAC Proof:</strong> <code>{receipt.hmac_proof}</code>
          </p>
        </div>
      )}

      <div style={{ background: '#fff', padding: '16px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
        <h2 style={{ marginTop: 0, fontSize: '1.1rem' }}>2. Manual Node Override & Human-in-the-Loop Gate</h2>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '12px' }}>
          <button onClick={discover} disabled={running} style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#f8fafc' }}>Discover</button>
          <button onClick={fetchDirectory} disabled={running} style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#f8fafc' }}>List Shops</button>
          <select value={selectedShop} onChange={(e) => setSelectedShop(e.target.value)} disabled={!!token || running} style={{ padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1' }}>
            <option value="velofix-hub">VeloFix Express (Fastest)</option>
