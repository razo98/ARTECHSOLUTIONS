const fs = require('node:fs');
const ts = require('typescript');
const { PDFDocument, PDFName } = require('pdf-lib');
const assert = require('node:assert/strict');
require.extensions['.ts'] = (module, filename) => module._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true } }).outputText, filename);
const { createReceipt } = require('../lib/receipt.ts');
const { normalizePhoto } = require('../lib/product-photo.ts');
(async () => {
  const sharp = require('sharp');
  const photo = await normalizePhoto(fs.readFileSync('public/logo-artech.jpeg'));
  assert.equal((await sharp(photo).metadata()).format, 'webp');
  const large = await sharp({ create: { width: 2400, height: 2000, channels: 3, background: '#1267dc' } }).png().toBuffer();
  const normalized = await sharp(await normalizePhoto(large)).metadata();
  assert.ok(normalized.width <= 1600 && normalized.height <= 1600);
  await assert.rejects(normalizePhoto(Buffer.from('<svg></svg>')), error => error.status === 400);
  await assert.rejects(normalizePhoto(Buffer.alloc(5 * 1024 * 1024 + 1)), error => error.status === 413);
  console.log('Photos: JPG/PNG accepted, WebP output, resizing, invalid and oversized files rejected');
  const items = [
    { name: 'Casque Bluetooth sans fil', quantity: 2, price: 12500 },
    { name: 'Chargeur rapide USB-C 30 W', quantity: 3, price: 5000 },
    { name: 'Clavier sans fil compact avec pavé numérique et touches multimédias', quantity: 1, price: 15000 },
    { name: 'Câble USB-C renforcé, longueur 2 mètres', quantity: 4, price: 2500 },
  ];
  const subtotal = items.reduce((sum, item) => sum + item.quantity * item.price, 0);
  const order = { reference: 'ART-EXEMPLE-RECU', createdAt: new Date().toISOString(), customer: { name: 'Client exemple', phone: '+227 90 00 00 00', note: '' }, items, subtotal, total: subtotal, fulfillment: 'pickup', deliveryFee: 0, paymentMethod: 'IN_STORE', paymentStatus: 'unpaid', status: 'ready' };
  fs.mkdirSync('test-results', { recursive: true });
  const longItems = Array.from({ length: 50 }, (_, i) => ({ ...items[i % items.length], name: `${i + 1}. ${items[i % items.length].name}` }));
  const longTotal = longItems.reduce((sum, item) => sum + item.quantity * item.price, 0);
  for (const [name, value] of [
    ['recu-apercu', order],
    ['recu-apercu-livraison', { ...order, fulfillment: 'delivery', deliveryAddress: 'Quartier Zak, rue principale, porte bleue', deliveryFee: 1500, total: subtotal + 1500, paymentMethod: 'MYNITA', paymentStatus: 'paid' }],
    ['recu-apercu-long', { ...order, items: longItems, subtotal: longTotal, total: longTotal }],
  ]) {
    const bytes = await createReceipt(value); fs.writeFileSync(`test-results/${name}.pdf`, bytes);
    const doc = await PDFDocument.load(bytes);
    assert.ok(doc.getPage(0).node.Resources().lookup(PDFName.of('XObject')).keys().length);
    if (name.endsWith('long')) assert.ok(doc.getPageCount() > 1);
    console.log(`${name}: ${doc.getPageCount()} page(s), logo embedded`);
  }
})().catch(error => { console.error(error.message); process.exitCode = 1; });
