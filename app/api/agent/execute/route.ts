import { NextResponse } from 'next/server';
import crypto from 'crypto';

const SHOPS = [
  {
    shop_id: 'velofix-hub',
    shop_name: 'VeloFix Express Hub',
    rating: '4.9 ★',
    services: [
      { id: 'tune-up', name: 'Full Bicycle Tune-Up', price: 55, eta_mins: 60 },
      { id: 'flat-tire', name: 'Flat Tire & Tube Replacement', price: 25, eta_mins: 20 },
      { id: 'brake-bleed', name: 'Hydraulic Brake Bleed', price: 42, eta_mins: 45 },
    ],
  },
  {
    shop_id: 'metro-cycle',
    shop_name: 'Metro Cycle Care',
    rating: '4.7 ★',
    services: [
      { id: 'tune-up', name: 'Full Bicycle Tune-Up', price: 45, eta_mins: 120 },
      { id: 'flat-tire', name: 'Flat Tire & Tube Replacement', price: 20, eta_mins: 40 },
      { id: 'brake-bleed', name: 'Hydraulic Brake Bleed', price: 35, eta_mins: 90 },
    ],
  },
  {
    shop_id: 'budget-pedal',
    shop_name: 'Budget Pedal Works',
    rating: '4.5 ★',
    services: [
      { id: 'tune-up', name: 'Full Bicycle Tune-Up', price: 35, eta_mins: 180 },
      { id: 'flat-tire', name: 'Flat Tire & Tube Replacement', price: 15, eta_mins: 60 },
      { id: 'brake-bleed', name: 'Hydraulic Brake Bleed', price: 28, eta_mins: 150 },
    ],
  },
];

const SECRET = process.env.AGENT_HMAC_SECRET || 'agentmesh-open-web-mvp-secret-2026';
const usedNonces = new Set<string>();

function createSignedToken(shopId: string, serviceId: string, discountPct: number): string {
  const payload = JSON.stringify({
    shopId,
    serviceId,
    discountPct,
    nonce: crypto.randomUUID(),
    exp: Date.now() + 5 * 60 * 1000,
  });
  const encoded = Buffer.from(payload).toString('base64url');
  const sig = crypto.createHmac('sha256', SECRET).update(encoded).digest('base64url');
  return `${encoded}.${sig}`;
}

function verifySignedToken(token: string, expectedShopId: string, expectedServiceId: string) {
  const parts = token.split('.');
  if (parts.length !== 2) return { valid: false, code: 403, reason: 'Malformed token format' };

  const [encoded, sig] = parts;
  const expectedSig = crypto.createHmac('sha256', SECRET).update(encoded).digest('base64url');

  if (sig.length !== expectedSig.length || !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expectedSig))) {
    return { valid: false, code: 403, reason: 'Invalid cryptographic signature' };
  }

  try {
    const data = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8'));
    if (Date.now() > data.exp) return { valid: false, code: 403, reason: 'Token expired (TTL 5m exceeded)' };
    if (data.shopId !== expectedShopId || data.serviceId !== expectedServiceId) {
      return { valid: false, code: 403, reason: 'Shop or Service binding mismatch' };
    }
    if (usedNonces.has(data.nonce)) {
      return { valid: false, code: 409, reason: 'Replay Attack Blocked: Token nonce already consumed' };
    }

    usedNonces.add(data.nonce);
    return { valid: true, code: 200, discountPct: Number(data.discountPct || 0), signaturePreview: sig.slice(0, 16) + '...' };
  } catch {
    return { valid: false, code: 403, reason: 'Corrupted token payload' };
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
      const shopId = typeof body.shop_id === 'string' ? body.shop_id.trim() : '';
      const serviceId = typeof body.service_id === 'string' ? body.service_id.trim() : '';
      const rawDiscount = typeof body.discount_percent === 'number' ? body.discount_percent : 0;
      const discountPct = rawDiscount === 15 ? 15 : 0;

      const shop = SHOPS.find((s) => s.shop_id === shopId);
      if (!shop) return NextResponse.json({ status: 'error', error: 'Unknown shop_id' }, { status: 400 });

      const service = shop.services.find((s) => s.id === serviceId);
      if (!service) return NextResponse.json({ status: 'error', error: 'Unknown service_id' }, { status: 400 });

      const finalPrice = discountPct > 0 ? Math.round(service.price * (1 - discountPct / 100)) : service.price;
      const quotedService = { ...service, original_price: service.price, price: finalPrice, discount_applied: `${discountPct}%` };

      const token = typeof body.confirmation_token === 'string' ? body.confirmation_token.trim() : '';
      if (!token) {
        return NextResponse.json(
          {
            status: 'confirmation_required',
            message: 'Explicit human approval required before binding quote.',
            confirmation_token: createSignedToken(shop.shop_id, service.id, discountPct),
            expires_in_seconds: 300,
            shop: { id: shop.shop_id, name: shop.shop_name, rating: shop.rating },
            service: quotedService,
          },
          { status: 403 }
        );
      }

      if (body.human_confirmed !== true) {
        return NextResponse.json({ status: 'blocked', error: 'Missing human_confirmed: true' }, { status: 403 });
      }

      const check = verifySignedToken(token, shop.shop_id, service.id);
      if (!check.valid) {
        return NextResponse.json({ status: 'blocked', error: check.reason }, { status: check.code });
      }

      const verifiedDiscount = check.discountPct || 0;
      const boundPrice = verifiedDiscount > 0 ? Math.round(service.price * (1 - verifiedDiscount / 100)) : service.price;
      const boundService = { ...service, original_price: service.price, price: boundPrice, discount_applied: `${verifiedDiscount}%` };

      return NextResponse.json({
        status: 'quote_approved',
        quote_id: `QT-${crypto.randomUUID().slice(0, 8).toUpperCase()}`,
        hmac_proof: check.signaturePreview,
        shop: { id: shop.shop_id, name: shop.shop_name, rating: shop.rating },
        service: boundService,
        approved_at: new Date().toISOString(),
      });
    }

    return NextResponse.json({ status: 'error', error: 'Unknown action' }, { status: 400 });
  } catch {
    return NextResponse.json({ status: 'error', error: 'Internal server error' }, { status: 500 });
  }
}

