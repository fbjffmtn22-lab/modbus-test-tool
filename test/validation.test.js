'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { validateConnectParams, validateReadParams, validateWriteParams, validatePollInterval } = require('../lib/validation');

test('accepts valid TCP settings', () => {
    assert.deepEqual(validateConnectParams({ mode: 'tcp', host: '127.0.0.1', port: '502', slaveId: '1', timeout: '5' }),
        { mode: 'tcp', host: '127.0.0.1', port: 502, slaveId: 1, timeout: 5 });
});

test('rejects invalid protocol ranges', () => {
    assert.throws(() => validateReadParams({ fc: 3, addr: -1, qty: 1 }), /起始地址/);
    assert.throws(() => validateReadParams({ fc: 3, addr: 0, qty: 126 }), /读取数量/);
    assert.throws(() => validatePollInterval(20), /轮询间隔/);
});

test('normalizes coil and register values', () => {
    assert.deepEqual(validateWriteParams({ fc: 15, addr: 0, values: ['0', '1'] }).values, [false, true]);
    assert.deepEqual(validateWriteParams({ fc: 16, addr: 0, values: ['0', '65535'] }).values, [0, 65535]);
    assert.throws(() => validateWriteParams({ fc: 6, addr: 0, values: 65536 }), /寄存器值/);
});
