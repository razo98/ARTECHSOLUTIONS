import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { setTimeout as pause } from 'node:timers/promises';
import { createRequire } from 'node:module';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
const require = createRequire(import.meta.url);
require('@next/env').loadEnvConfig(process.cwd());
const mongoose = require('mongoose');
let localDatabase;
if (process.env.SHOP_LOCAL_DB === '1') {
  const { MongoMemoryReplSet } = await import('mongodb-memory-server');
  localDatabase = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
}
const uri = new URL(localDatabase ? localDatabase.getUri() : process.env.MONGODB_URI);
const database = `artech_shop_test_${Date.now()}`;
uri.pathname = `/${database}`;
const port = process.env.TEST_PORT || '3107';
const base = `http://127.0.0.1:${port}`;
const child = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'dev', '--hostname', '127.0.0.1', '--port', port], { env: { ...process.env, MONGODB_URI: uri.toString(), NEXT_BUILD_DIR: '.next-test', NODE_ENV: 'development' }, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
let log = '';
child.stdout.on('data', data => { log = (log + data.toString()).slice(-5000); });
child.stderr.on('data', data => { log = (log + data.toString()).slice(-5000); });
let cookie = '';
async function request(path, method = 'GET', data, admin = false) {
  const response = await fetch(base + path, { method, headers: { 'Content-Type': 'application/json', ...(method !== 'GET' ? { Origin: base } : {}), ...(admin ? { Cookie: cookie } : {}) }, ...(data !== undefined ? { body: JSON.stringify(data) } : {}) });
  const value = response.headers.get('content-type')?.includes('json') ? await response.json() : await response.text();
  return { response, value, status: response.status };
}
async function ok(path, method = 'GET', data, admin = false) {
  const result = await request(path, method, data, admin);
  assert.ok(result.status < 400, `${method} ${path.split('/').slice(0,3).join('/')} -> ${result.status}: ${JSON.stringify(result.value)}`);
  return result.value;
}
const product = { name: 'Article test', category: 'Tests', description: 'Description de test', image: '/logo-artech.jpeg', price: 2500, stock: 3, active: true };
const checkout = (id, quantity = 1, checkoutKey = randomUUID()) => ({ checkoutKey, customer: { name: 'Client test', phone: '+22790000000', note: 'Test automatique' }, paymentMethod: 'MYNITA', items: [{ productId: id, quantity }] });
let passed = 0;
function pass(message) { passed++; console.log(`PASS ${message}`); }
try {
  let ready = false;
  for (let i = 0; i < 90; i++) {
    if (child.exitCode !== null) throw new Error('Test server stopped');
    try { if ((await fetch(base + '/api/admin/session')).ok) { ready = true; break; } } catch {}
    await pause(1000);
  }
  assert.ok(ready, 'Test server ready');
  assert.equal((await request('/api/products', 'POST', product)).status, 401);
  assert.equal((await request('/api/orders')).status, 401);
  assert.equal((await request('/api/products?admin=1')).status, 401);
  pass('Administration and order list require authentication');
  const login = await request('/api/admin/session', 'POST', { email: process.env.ADMIN_EMAIL, password: process.env.ADMIN_PASSWORD });
  assert.equal(login.status, 200); cookie = login.response.headers.get('set-cookie').split(';')[0];
  assert.ok(login.response.headers.get('set-cookie').includes('HttpOnly'));
  pass('Admin login creates an HttpOnly session');
  const photoBytes = await readFile('public/logo-artech.jpeg');
  const upload = (data, authenticated = true) => fetch(base + '/api/images', { method: 'POST', headers: { Origin: base, 'Content-Type': 'image/jpeg', ...(authenticated ? { Cookie: cookie } : {}) }, body: data });
  assert.equal((await upload(photoBytes, false)).status, 401);
  assert.equal((await upload(Buffer.from('<svg><script>alert(1)</script></svg>'))).status, 400);
  assert.equal((await upload(Buffer.alloc(5 * 1024 * 1024 + 1))).status, 413);
  const uploaded = await upload(photoBytes); assert.equal(uploaded.status, 201);
  const imageUrl = (await uploaded.json()).url;
  const savedPhoto = await fetch(base + imageUrl); assert.equal(savedPhoto.status, 200);
  assert.equal(savedPhoto.headers.get('content-type'), 'image/webp');
  assert.equal(Buffer.from(await savedPhoto.arrayBuffer()).subarray(8,12).toString(), 'WEBP');
  product.image = imageUrl;
  pass('Image upload requires authentication, rejects invalid/oversized files and serves persisted photos');
  await ok('/api/payments', 'PUT', { method: 'MYNITA', account: 'TEST ACCOUNT ONLY', instructions: 'Test transfer only', available: true }, true);
  assert.equal((await request('/api/products', 'POST', { ...product, price: -1 }, true)).status, 400);
  const p = await ok('/api/products', 'POST', product, true);
  const hidden = await ok('/api/products', 'POST', { ...product, name: 'Hidden', active: false }, true);
  assert.equal((await ok('/api/products')).some(p => p._id === hidden._id), false);
  pass('Product validation and hidden articles');
  const payload = checkout(p._id, 2);
  payload.items[0].price = 1;
  const created = await ok('/api/orders', 'POST', payload);
  const order = await ok(`/api/orders/${created.token}`);
  assert.equal(order.total, 5000); assert.equal(order.paymentStatus, 'unpaid');
  assert.equal((await ok('/api/products')).find(x => x._id === p._id).stock, 1);
  assert.equal('checkoutKey' in order, false);
  assert.equal((await ok('/api/orders', 'POST', payload)).token, created.token);
  assert.equal((await ok('/api/products')).find(x => x._id === p._id).stock, 1);
  pass('Server prices, reserved stock, idempotent checkout, private key omitted');
  assert.equal((await request('/api/orders', 'POST', checkout(p._id, 2))).status, 409);
  assert.equal((await request(`/api/products/${p._id}`, 'PATCH', { ...p, stock: 100 }, true)).status, 409);
  assert.equal((await request(`/api/orders/${order._id}`)).status, 404);
  pass('Insufficient stock, stale edits and invalid order access rejected');
  const pdf = await fetch(base + `/api/orders/${created.token}/pdf`);
  assert.equal(pdf.status, 200); assert.equal(pdf.headers.get('content-type'), 'application/pdf');
  const receiptBytes = Buffer.from(await pdf.arrayBuffer());
  assert.equal(receiptBytes.subarray(0,5).toString(), '%PDF-');
  await mkdir('test-results', { recursive: true }); await writeFile('test-results/recu-exemple.pdf', receiptBytes);
  const { PDFDocument, PDFName } = require('pdf-lib');
  const receipt = await PDFDocument.load(receiptBytes);
  assert.ok(receipt.getPage(0).node.Resources().lookup(PDFName.of('XObject')).keys().length > 0, 'Receipt embeds the company logo');
  const db = await mongoose.createConnection(uri.toString()).asPromise();
  try {
    const manyItems = Array.from({ length: 50 }, (_, i) => ({ productId: new mongoose.Types.ObjectId(), name: `Article ${i+1} - Accessoire informatique avec une description suffisamment longue pour occuper plusieurs lignes`, quantity: i+1, price: 2500 }));
    const total = manyItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const longToken = 'd'.repeat(64);
    await db.collection('orders').insertOne({ reference: 'ART-TEST-MULTIPAGE', token: longToken, checkoutKey: randomUUID(), customer: { name: 'Client de test', phone: '+22790000000', note: 'Recu de verification multi-pages' }, createdAt: new Date(), items: manyItems, subtotal: total, total, fulfillment: 'pickup', deliveryFee: 0, status: 'pending', paymentStatus: 'unpaid', paymentMethod: 'IN_STORE' });
    const longResponse = await fetch(base + `/api/orders/${longToken}/pdf`); assert.equal(longResponse.status, 200);
    const longBytes = Buffer.from(await longResponse.arrayBuffer()); const longPdf = await PDFDocument.load(longBytes);
    assert.ok(longPdf.getPageCount() > 1);
    await writeFile('test-results/recu-multipage.pdf', longBytes);
  } finally { await db.close(); }
  pass('Order PDF is a valid downloadable PDF');
  let updated = await ok(`/api/orders/${created.token}`, 'PATCH', { paymentReference: 'TEST-TX-123' });
  assert.equal(updated.paymentStatus, 'submitted');
  assert.equal((await request(`/api/admin/orders/${order._id}`, 'PATCH', { action: 'approve-payment', __v: updated.__v })).status, 401);
  updated = await ok(`/api/admin/orders/${order._id}`, 'PATCH', { action: 'approve-payment', __v: updated.__v }, true);
  assert.equal(updated.paymentStatus, 'paid');
  assert.equal((await request(`/api/orders/${created.token}`, 'PATCH', { paymentReference: 'OVERWRITE' })).status, 409);
  assert.equal((await request(`/api/admin/orders/${order._id}`, 'PATCH', { action: 'cancel', __v: updated.__v }, true)).status, 409);
  for (const status of ['confirmed', 'preparing', 'ready', 'completed']) { updated = await ok(`/api/admin/orders/${order._id}`, 'PATCH', { action: 'advance', __v: updated.__v }, true); assert.equal(updated.status, status); }
  pass('Payment declaration, admin validation and paid order completion');
  const last = await Promise.all([request('/api/orders', 'POST', checkout(p._id)), request('/api/orders', 'POST', checkout(p._id))]);
  assert.deepEqual(last.map(r => r.status).sort(), [201, 409]);
  const reserved = await ok(`/api/orders/${last.find(r => r.status === 201).value.token}`);
  await ok(`/api/admin/orders/${reserved._id}`, 'PATCH', { action: 'cancel', __v: reserved.__v }, true);
  assert.equal((await ok('/api/products')).find(x => x._id === p._id).stock, 1);
  assert.equal((await request(`/api/admin/orders/${reserved._id}`, 'PATCH', { action: 'cancel', __v: reserved.__v }, true)).status, 409);
  assert.equal((await ok('/api/products')).find(x => x._id === p._id).stock, 1);
  pass('Concurrent checkout prevents overselling; cancellation restores stock once');
  const fresh = await ok('/api/products', 'POST', { ...product, name: 'Rollback', stock: 5 }, true);
  const mixed = checkout(fresh._id, 2); mixed.items.push({ productId: p._id, quantity: 10 });
  assert.equal((await request('/api/orders', 'POST', mixed)).status, 409);
  assert.equal((await ok('/api/products')).find(x => x._id === fresh._id).stock, 5);
  pass('Multi-product checkout rolls back all stock on failure');
  const pickup = await ok('/api/orders', 'POST', { ...checkout(fresh._id), paymentMethod: 'IN_STORE', fulfillment: 'pickup' });
  let atStore = await ok(`/api/orders/${pickup.token}`);
  assert.equal(atStore.fulfillment, 'pickup'); assert.equal(atStore.paymentStatus, 'unpaid');
  assert.equal((await request(`/api/admin/orders/${atStore._id}`, 'PATCH', { action: 'collect-in-store', __v: atStore.__v })).status, 401);
  assert.equal((await request(`/api/orders/${pickup.token}`, 'PATCH', { paymentReference: 'FAKE-PAID' })).status, 400);
  for (let i = 0; i < 3; i++) atStore = await ok(`/api/admin/orders/${atStore._id}`, 'PATCH', { action: 'advance', __v: atStore.__v }, true);
  assert.equal((await request(`/api/admin/orders/${atStore._id}`, 'PATCH', { action: 'advance', __v: atStore.__v }, true)).status, 409);
  atStore = await ok(`/api/admin/orders/${atStore._id}`, 'PATCH', { action: 'collect-in-store', __v: atStore.__v }, true);
  assert.equal(atStore.paymentStatus, 'paid');
  assert.equal((await request(`/api/admin/orders/${atStore._id}`, 'PATCH', { action: 'collect-in-store', __v: atStore.__v }, true)).status, 409);
  atStore = await ok(`/api/admin/orders/${atStore._id}`, 'PATCH', { action: 'advance', __v: atStore.__v }, true);
  assert.equal(atStore.status, 'completed');
  pass('Pickup receipt, authenticated in-store collection, no unpaid or double collection');
  assert.equal((await request('/api/orders', 'POST', { ...checkout(fresh._id), fulfillment: 'delivery' })).status, 400);
  assert.equal((await request('/api/orders', 'POST', { ...checkout(fresh._id), fulfillment: 'delivery', deliveryAddress: 'Quartier test, porte 12', paymentMethod: 'IN_STORE' })).status, 400);
  const delivery = await ok('/api/orders', 'POST', { ...checkout(fresh._id), fulfillment: 'delivery', deliveryAddress: 'Quartier test, porte 12', deliveryFee: 0, total: 1 });
  let toDeliver = await ok(`/api/orders/${delivery.token}`);
  assert.equal(toDeliver.deliveryFee, null); assert.equal(toDeliver.subtotal, 2500); assert.equal(toDeliver.total, 2500);
  assert.equal((await request(`/api/orders/${delivery.token}`, 'PATCH', { paymentReference: 'TOO-EARLY' })).status, 409);
  assert.equal((await request(`/api/admin/orders/${toDeliver._id}`, 'PATCH', { action: 'set-delivery-fee', deliveryFee: 1000, __v: toDeliver.__v })).status, 401);
  assert.equal((await request(`/api/admin/orders/${toDeliver._id}`, 'PATCH', { action: 'set-delivery-fee', deliveryFee: -1, __v: toDeliver.__v }, true)).status, 400);
  toDeliver = await ok(`/api/admin/orders/${toDeliver._id}`, 'PATCH', { action: 'set-delivery-fee', deliveryFee: 1000, __v: toDeliver.__v }, true);
  assert.equal(toDeliver.total, 3500);
  for (let i = 0; i < 3; i++) toDeliver = await ok(`/api/admin/orders/${toDeliver._id}`, 'PATCH', { action: 'advance', __v: toDeliver.__v }, true);
  assert.equal((await request(`/api/admin/orders/${toDeliver._id}`, 'PATCH', { action: 'advance', __v: toDeliver.__v }, true)).status, 409);
  toDeliver = await ok(`/api/orders/${delivery.token}`, 'PATCH', { paymentReference: 'DELIVERY-TX' });
  assert.equal((await request(`/api/admin/orders/${toDeliver._id}`, 'PATCH', { action: 'set-delivery-fee', deliveryFee: 2000, __v: toDeliver.__v }, true)).status, 409);
  assert.equal((await request(`/api/admin/orders/${toDeliver._id}`, 'PATCH', { action: 'collect-in-store', __v: toDeliver.__v }, true)).status, 409);
  toDeliver = await ok(`/api/admin/orders/${toDeliver._id}`, 'PATCH', { action: 'approve-payment', __v: toDeliver.__v }, true);
  toDeliver = await ok(`/api/admin/orders/${toDeliver._id}`, 'PATCH', { action: 'advance', __v: toDeliver.__v }, true);
  assert.equal(toDeliver.status, 'out_for_delivery');
  toDeliver = await ok(`/api/admin/orders/${toDeliver._id}`, 'PATCH', { action: 'advance', __v: toDeliver.__v }, true);
  assert.equal(toDeliver.status, 'completed');
  assert.equal((await fetch(base + `/api/orders/${delivery.token}/pdf`)).status, 200);
  pass('Delivery address, server-priced fees, blocked early payment, dispatch and delivery completion');
  const crossSite = await fetch(base + '/api/products', { method: 'POST', headers: { Origin: 'https://other.invalid', Cookie: cookie, 'Content-Type': 'application/json' }, body: JSON.stringify(product) });
  assert.equal(crossSite.status, 403);
  await ok('/api/admin/session', 'DELETE', undefined, true);
  pass('Cross-origin mutations rejected; logout works');
  if (process.env.SHOP_BROWSER_TEST === '1') {
    const { browserChecks } = await import('./shop.browser.mjs');
    await browserChecks(base);
  }
  console.log(`${passed} integration checks passed.`);
} catch (error) {
  console.error(error.message);
  console.error(log.replace(/mongodb(?:\+srv)?:\/\/\S+/g, '[redacted]'));
  process.exitCode = 1;
} finally {
  if (process.platform === 'win32') spawnSync('taskkill', ['/pid', String(child.pid), '/T', '/F'], { windowsHide: true, stdio: 'ignore' });
  else child.kill();
  try {
    await mongoose.connect(uri.toString(), { serverSelectionTimeoutMS: 10000 });
    if (mongoose.connection.name === database && /^artech_shop_test_\d+$/.test(database)) await mongoose.connection.db.dropDatabase();
  } catch { console.error('Temporary database cleanup could not connect. No live database was modified.'); process.exitCode = 1; }
  finally { await mongoose.disconnect(); if (localDatabase) await localDatabase.stop(); }
}
