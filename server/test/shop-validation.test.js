import test from 'node:test';
import assert from 'node:assert/strict';
import { validateItems, validateProduct } from '../utils/shop-validation.js';

test('cart and order items reject bad quantities and duplicates', () => {
  assert.equal(validateItems([], true), '');
  assert.notEqual(validateItems([]), '');
  for (const quantity of [0, -1, 1.5, 10001, Infinity, NaN, '2']) {
    assert.notEqual(validateItems([{ id: 1, quantity }]), '');
  }
  assert.equal(validateItems([{ id: 1, quantity: 10000 }]), '');
  assert.notEqual(validateItems([{ id: 1, quantity: 1 }, { id: 1, quantity: 2 }]), '');
});

test('product validation rejects invalid prices and accepts valid details', () => {
  assert.equal(validateProduct({ name: 'Wrench', price: 12.50 }), '');
  assert.notEqual(validateProduct({ name: 'Wrench', price: 1.001 }), '');
  assert.notEqual(validateProduct({ name: 'Wrench', price: 1, imageUrl: 'javascript:alert(1)' }), '');
});
