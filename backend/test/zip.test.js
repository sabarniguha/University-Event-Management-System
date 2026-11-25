const test = require('node:test');
const assert = require('node:assert');
const { createZip, crc32 } = require('../src/utils/zip');

test('crc32 matches the standard check value', () => {
  assert.strictEqual(crc32(Buffer.from('123456789')), 0xcbf43926);
});

test('zip has the right signatures and entry count', () => {
  const z = createZip([{ name: 'a.pdf', data: Buffer.from('hello') }, { name: 'b.pdf', data: Buffer.from('world!') }]);
  assert.strictEqual(z.readUInt32LE(0), 0x04034b50);
  assert.strictEqual(z.readUInt32LE(z.length - 22), 0x06054b50);
  assert.strictEqual(z.readUInt16LE(z.length - 22 + 10), 2);
});
