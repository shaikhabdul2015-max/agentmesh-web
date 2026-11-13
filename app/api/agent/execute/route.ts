import { NextResponse } from 'next/server';
import crypto from 'crypto';

const SERVICES = [
  { id: 'tune-up', name: 'Full Bicycle Tune-Up', price: '$45', eta: '2 hours' },
  { id: 'flat-tire', name: 'Flat Tire & Tube Replacement', price: '$20', eta: '30 mins' },
  { id: 'brake-bleed', name: 'Hydraulic Brake Bleed', price: '$35', eta: '1 hour' }
];

// Stateless HMAC Secret for Vercel Serverless compatibility
const SECRET = process.env.AGENT_HMAC_SECRET || 'agentmesh-open-web-mvp-secret-2026';
const usedNonces = new Set<string>();

function createSignedToken(serviceId: string): string {
  const payload = JSON.stringify({
    serviceId,
    nonce: crypto.randomUUID(),
    exp: Date.now() + 5 * 60 * 1000 // 5 minutes expiry
  });
  const encoded = Buffer.from(payload).toString('base64url');
  const sig = crypto.createHmac('sha256', SECRET).update(encoded).digest('base64url');
  return `${encoded}.${sig}`;
}

function verifySignedToken(token: string, expectedServiceId: string): { valid: boolean; reason?: string } {
  const parts = token.split('.');
  if (parts.length !== 2) return { valid: false, reason: 'Malformed token' };

  const [encoded, sig] = parts;
  const expectedSig = crypto.createHmac('sha256', SECRET).update(encoded).digest('base64url');
  
  if (sig.length !== expectedSig.length || !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expectedSig))) {
    return { valid: false, reason: 'Invalid cryptographic signature' };
  }

  try {
    const data = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8'));
    if (Date.now() > data.exp) return { valid: false, reason: 'Token expired' };
    if (data.serviceId !== expectedServiceId) return { valid: false, reason: 'Service ID mismatch' };
    if (usedNonces.has(data.nonce)) return { valid: false, reason: 'Token replay rejected' };
    
    usedNonces.add(data.nonce);
    return { valid: true };
  } catch {
    return { valid: false, reason: 'Corrupted token payload' };
  }
}

export async function POST(req: Request) {
  try {
    const rawBody = await req.text();
    // Enforce UTF-8 byte length limit (10KB)
    if (Buffer.byteLength(rawBody, 'utf8') > 10240) {
      return NextResponse.json({ status: 'error', error: 'Payload exceeds 10KB UTF-8 byte limit' }, { status: 413 });
    }

    let body: Record<string, unknown>;
    try {
      body = JSON.parse(rawBody);
    } catch {
      return NextResponse.json({ status: 'error', error: 'Invalid JSON payload' }, { status: 400 });
    }

    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return NextResponse.json({ status: 'error', error: 'Invalid request body' }, { status: 400 });
    }

    if (body.action === 'list_services') {
      return NextResponse.json({ status: 'success', services: SERVICES });
    }

    if (body.action === 'request_quote') {
      const serviceId = typeof body.service_id === 'string' ? body.service_id.trim() : '';
      const service = SERVICES.find((s) => s.id === serviceId);
      if (!service) {
        return NextResponse.json({ status: 'error', error: 'Unknown or missing service_id' }, { status: 400 });
      }

      const token = typeof body.confirmation_token === 'string' ? body.confirmation_token : '';
      if (!token) {
        return NextResponse.json(
          {
            status: 'confirmation_required',
            message: 'Explicit human approval required via UI before quote submission.',
            confirmation_token: createSignedToken(service.id),
            service
          },
          { status: 403 }
        );
      }

      if (body.human_confirmed !== true) {
        return NextResponse.json({ status: 'blocked', error: 'Missing human_confirmed: true' }, { status: 403 });
      }

      const check = verifySignedToken(token, service.id);
      if (!check.valid) {
        return NextResponse.json({ status: 'blocked', error: check.reason }, { status: 403 });
      }

      return NextResponse.json({
        status: 'quote_approved',
        quote_id: `QT-${crypto.randomUUID()}`,
        service,
        approved_at: new Date().toISOString()
      });
    }

    return NextResponse.json({ status: 'error', error: 'Unknown action' }, { status: 400 });
  } catch {
    return NextResponse.json({ status: 'error', error: 'Internal server error' }, { status: 500 });
  }
}
