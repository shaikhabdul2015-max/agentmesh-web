'use client';
import { useState, useEffect } from 'react';

type ApprovalStatus = 'Idle' | 'Pending' | 'Approved' | 'Rejected' | 'Expired';

export default function HomePage() {
  const [logs, setLogs] = useState<string[]>([
    'Agent Inspector ready. Run steps 1–4 to verify Open Agentic Web discovery & HITL security.'
  ]);
  const [token, setToken] = useState<string>('');
  const [tokenExpiresAt, setTokenExpiresAt] = useState<number | null>(null);
  const [selectedService, setSelectedService] = useState<string>('tune-up');
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const [status, setStatus] = useState<ApprovalStatus>('Idle');

  const addLog = (msg: string) => {
    setLogs((prev) => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev]);
  };

  // Automatically expire pending token after 5 minutes
  useEffect(() => {
    if (!token || !tokenExpiresAt) return;
    const remaining = tokenExpiresAt - Date.now();
    if (remaining <= 0) {
      setToken('');
      setTokenExpiresAt(null);
      setStatus('Expired');
      addLog('Security Notice: Pending confirmation token expired after 5 minutes.');
      return;
    }
    const timer = setTimeout(() => {
      setToken('');
      setTokenExpiresAt(null);
      setStatus('Expired');
      addLog('Security Notice: Pending confirmation token expired after 5 minutes.');
    }, remaining);
    return () => clearTimeout(timer);
  }, [token, tokenExpiresAt]);

  const runDiscover = async () => {
    if (loadingAction) return;
    setLoadingAction('discover');
    addLog('Agent fetching /.well-known/agent.json...');
    try {
      const res = await fetch('/.well-known/agent.json');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const actionNames = Array.isArray(data.actions)
        ? data.actions.map((a: { name: string }) => a.name).join(', ')
        : 'none';
      addLog(`Discovered: ${data.name} | Actions: ${actionNames}`);
    } catch (err) {
      addLog(`Discovery Error: ${err instanceof Error ? err.message : 'Network failure'}`);
    } finally {
      setLoadingAction(null);
    }
  };

  const runListServices = async () => {
    if (loadingAction) return;
    setLoadingAction('list');
    addLog('Agent calling POST /api/agent/execute {"action": "list_services"}...');
    try {
      const res = await fetch('/api/agent/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'list_services' })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      addLog(`Services received (${data.services?.length || 0}): ${JSON.stringify(data.services)}`);
    } catch (err) {
      addLog(`Service API Error: ${err instanceof Error ? err.message : 'Network failure'}`);
    } finally {
      setLoadingAction(null);
    }
  };

  const requestQuoteChallenge = async () => {
    if (loadingAction) return;
    setLoadingAction('request');
    addLog(`Agent requesting quote for "${selectedService}" without human approval...`);
    try {
      const res = await fetch('/api/agent/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'request_quote', service_id: selectedService })
      });
      const data = await res.json();

      if (res.status === 403 && data.confirmation_token) {
        setToken(data.confirmation_token);
        setTokenExpiresAt(Date.now() + 5 * 60 * 1000);
        setStatus('Pending');
        addLog(`HTTP 403 Gate Active: Server issued signed single-use challenge token for "${selectedService}". Awaiting human approval.`);
      } else if (!res.ok) {
        setStatus('Rejected');
        addLog(`Blocked (HTTP ${res.status}): ${data.error || 'Request rejected'}`);
      }
    } catch (err) {
      addLog(`Network Error: ${err instanceof Error ? err.message : 'Unable to reach server'}`);
    } finally {
      setLoadingAction(null);
    }
  };

  const approveAsHuman = async () => {
    if (loadingAction || !token) return;
    if (tokenExpiresAt && Date.now() > tokenExpiresAt) {
      setToken('');
      setTokenExpiresAt(null);
      setStatus('Expired');
      addLog('Cannot approve: Confirmation token has expired.');
      return;
    }

    setLoadingAction('approve');
    addLog(`Human explicitly approved "${selectedService}". Submitting signed token to backend...`);
    try {
      const res = await fetch('/api/agent/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'request_quote',
          service_id: selectedService,
          confirmation_token: token,
          human_confirmed: true
        })
      });
      const data = await res.json();
      setToken('');
      setTokenExpiresAt(null);

      if (res.ok && data.status === 'quote_approved') {
        setStatus('Approved');
        addLog(`Success (HTTP 200): Quote Approved! ID: ${data.quote_id}`);
      } else {
        setStatus('Rejected');
        addLog(`Rejected (HTTP ${res.status}): ${data.error || 'Verification failed'}`);
      }
    } catch (err) {
      addLog(`Approval Error: ${err instanceof Error ? err.message : 'Network failure'}`);
    } finally {
      setLoadingAction(null);
    }
  };

  const resetPending = () => {
    setToken('');
    setTokenExpiresAt(null);
    setStatus('Rejected');
    addLog('Human rejected/cancelled pending quote request. Token cleared.');
  };

  const statusColors: Record<ApprovalStatus, string> = {
    Idle: '#64748b',
    Pending: '#d97706',
    Approved: '#16a34a',
    Rejected: '#dc2626',
    Expired: '#9333ea'
  };

  return (
    <main style={{ maxWidth: '800px', margin: '0 auto' }}>
      <header style={{ background: '#0f172a', color: 'white', padding: '20px', borderRadius: '10px', marginBottom: '20px' }}>
        <h1 style={{ margin: 0, fontSize: '1.5rem' }}>🚲 AgentMesh Web</h1>
        <p style={{ margin: '6px 0 0', color: '#94a3b8', fontSize: '0.95rem' }}>
          Open Agentic Web Bicycle Repair Portal (Human + AI Agent Dual View)
        </p>
      </header>

      <section style={{ background: 'white', padding: '20px', borderRadius: '10px', marginBottom: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
        <h2 style={{ marginTop: 0, fontSize: '1.2rem' }}>1. Human Service Catalog</h2>
        <ul style={{ lineHeight: '1.7', paddingLeft: '20px' }}>
          <li><strong>Full Bicycle Tune-Up</strong> — $45 (ETA: 2 hours)</li>
          <li><strong>Flat Tire & Tube Replacement</strong> — $20 (ETA: 30 mins)</li>
          <li><strong>Hydraulic Brake Bleed</strong> — $35 (ETA: 1 hour)</li>
        </ul>
        <p style={{ fontSize: '14px', color: '#475569', marginBottom: 0 }}>
          Machine-readable endpoints:{' '}
          <a href="/.well-known/agent.json" style={{ color: '#2563eb' }}>/.well-known/agent.json</a> |{' '}
          <a href="/llms.txt" style={{ color: '#2563eb' }}>/llms.txt</a>
        </p>
      </section>

      <section style={{ background: 'white', padding: '20px', borderRadius: '10px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', marginBottom: '15px' }}>
          <h2 style={{ margin: 0, fontSize: '1.2rem' }}>2. Live AI Agent Inspector & HITL Gate</h2>
          <span
            aria-live="polite"
            style={{
              backgroundColor: statusColors[status],
              color: 'white',
              padding: '4px 12px',
              borderRadius: '999px',
              fontSize: '13px',
              fontWeight: 'bold'
            }}
          >
            Status: {status}
          </span>
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginBottom: '15px' }}>
          <button
            type="button"
            aria-label="Discover Agent Manifest"
            onClick={runDiscover}
            disabled={loadingAction !== null}
            style={{ padding: '10px 14px', cursor: loadingAction ? 'wait' : 'pointer', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#f8fafc' }}
          >
            {loadingAction === 'discover' ? 'Discovering...' : '1. Discover Manifest'}
          </button>

          <button
            type="button"
            aria-label="List Bicycle Repair Services"
            onClick={runListServices}
            disabled={loadingAction !== null}
            style={{ padding: '10px 14px', cursor: loadingAction ? 'wait' : 'pointer', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#f8fafc' }}
          >
            {loadingAction === 'list' ? 'Loading Services...' : '2. List Services (API)'}
          </button>

          <select
            aria-label="Select Bicycle Repair Service"
            value={selectedService}
            onChange={(e) => setSelectedService(e.target.value)}
            disabled={Boolean(token) || loadingAction !== null}
            style={{
              padding: '10px',
              borderRadius: '6px',
              border: '1px solid #cbd5e1',
              backgroundColor: token ? '#e2e8f0' : 'white',
              cursor: token ? 'not-allowed' : 'pointer'
            }}
          >
            <option value="tune-up">Full Tune-Up ($45)</option>
            <option value="flat-tire">Flat Tire ($20)</option>
            <option value="brake-bleed">Brake Bleed ($35)</option>
          </select>

          <button
            type="button"
            aria-label="Simulate AI Agent Quote Request"
            onClick={requestQuoteChallenge}
            disabled={loadingAction !== null || Boolean(token)}
            style={{
              padding: '10px 14px',
              cursor: loadingAction || token ? 'not-allowed' : 'pointer',
