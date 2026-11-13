import { NextResponse } from 'next/server';
import crypto from 'crypto';

const SHOPS = [
  {
    shop_id: 'velofix-hub',
    shop_name: 'VeloFix Express Hub',
    rating: '4.9 ★',
    services: [
      { id: 'tune-up', name: 'Full Bicycle Tune-Up', price: 55, eta_mins: 90 },
      { id: 'flat-tire', name: 'Flat Tire & Tube Replacement', price: 25, eta_mins: 20 },
      { id: 'brake-bleed', name: 'Hydraulic Brake Bleed', price: 42, eta_mins: 45 }
    ]
  },
  {
    shop_id: 'metro-cycle',
    shop_name: 'Metro Cycle Care',
    rating: '4.7 ★',
    services: [
      { id: 'tune-up', name: 'Full Bicycle Tune-Up', price: 45, eta_mins: 120 },
      { id: 'flat-tire', name: 'Flat Tire & Tube Replacement', price: 20, eta_mins: 30 },
      { id: 'brake-bleed', name: 'Hydraulic Brake Bleed', price: 35, eta_mins: 60 }
    ]
  },
  {
    shop_id: 'budget-pedal',
    shop_name: 'Budget Pedal Works',
    rating: '4.5 ★',
    services: [
      { id: 'tune-up', name: 'Full Bicycle Tune-Up', price: 35, eta_mins: 180 },
      { id: 'flat-tire', name: 'Flat Tire & Tube Replacement', price: 15, eta_mins: 45 },
      { id: 'brake-bleed', name: 'Hydraulic Brake Bleed', price: 28, eta_mins: 90 }
    ]
  }
];

const SECRET = process.env.AGENT_HMAC_SECRET || 'agentmesh-open-web-mvp-secret-2026';
const usedNonces = new Set<string>();

function createSignedToken(shopId: string, serviceId: string): string {
  const payload = JSON.stringify({
    shopId,
    serviceId,
    nonce: crypto.randomUUID(),
    exp: Date.now() + 5 * 60 * 1000
  });
  const encoded = Buffer.from(payload).toString('base64url');
  const sig = crypto.createHmac('sha256', SECRET).update(encoded).digest('base64url');
  return `${encoded}.${sig}`;
}

function verifySignedToken(token: string, expectedShopId: string, expectedServiceId: string): { valid: boolean; reason?: string; signaturePreview?: string } {
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
    if (data.shopId !== expectedShopId || data.serviceId !== expectedServiceId) {
      return { valid: false, reason: 'Shop or Service binding mismatch' };
    }
    if (usedNonces.has(data.nonce)) return { valid: false, reason: 'Token replay rejected' };

    usedNonces.add(data.nonce);
    return { valid: true, signaturePreview: sig.slice(0, 16) + '...' };
  } catch {
    return { valid: false, reason: 'Corrupted token payload' };
  }
}

export async function POST(req: Request) {
  try {
    const rawBody = await req.text();
    if (Buffer.byteLength(rawBody, 'utf8') > 10240) {
      return NextResponse.json({ status: 'error', error: 'Payload exceeds 10KB limit' }, { status: 413 });
    }

    let body: Record<string, unknown>;
    try {
      body = JSON.parse(rawBody);
    } catch {
      return NextResponse.json({ status: 'error', error: 'Invalid JSON payload' }, { status: 400 });
    }

    if (body.action === 'list_services') {
      return NextResponse.json({ status: 'success', directory_count: SHOPS.length, shops: SHOPS });
    }

    if (body.action === 'request_quote') {
      const shopId = typeof body.shop_id === 'string' ? body.shop_id.trim() : 'metro-cycle';
      const serviceId = typeof body.service_id === 'string' ? body.service_id.trim() : '';

      const shop = SHOPS.find((s) => s.shop_id === shopId);
      if (!shop) return NextResponse.json({ status: 'error', error: 'Unknown shop_id' }, { status: 400 });

      const service = shop.services.find((s) => s.id === serviceId);
      if (!service) return NextResponse.json({ status: 'error', error: 'Unknown service_id' }, { status: 400 });

      const token = typeof body.confirmation_token === 'string' ? body.confirmation_token : '';
      if (!token) {
        return NextResponse.json(
          {
            status: 'confirmation_required',
            message: 'Explicit human approval required before binding quote.',
            confirmation_token: createSignedToken(shop.shop_id, service.id),
            expires_in_seconds: 300,
            shop: { id: shop.shop_id, name: shop.shop_name, rating: shop.rating },
            service
          },
          { status: 403 }
        );
      }

      if (body.human_confirmed !== true) {
        return NextResponse.json({ status: 'blocked', error: 'Missing human_confirmed: true' }, { status: 403 });
      }

      const check = verifySignedToken(token, shop.shop_id, service.id);
      if (!check.valid) {
        return NextResponse.json({ status: 'blocked', error: check.reason }, { status: 403 });
      }

      return NextResponse.json({
        status: 'quote_approved',
        quote_id: `QT-${crypto.randomUUID().slice(0, 8).toUpperCase()}`,
        hmac_proof: check.signaturePreview,
        shop: { id: shop.shop_id, name: shop.shop_name, rating: shop.rating },
        service,
        approved_at: new Date().toISOString()
      });
    }

    return NextResponse.json({ status: 'error', error: 'Unknown action' }, { status: 400 });
  } catch {
    return NextResponse.json({ status: 'error', error: 'Internal server error' }, { status: 500 });
  }
}

