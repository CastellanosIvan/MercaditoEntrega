import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateShipping,
  convertUSDToMXN,
  calculateSubtotalMXN,
  haversineDistanceKm,
} from './shopLogic';
import { CartItem } from '../types';

test('calculateShipping: returns free shipping under 3 km', () => {
  assert.equal(calculateShipping(0), 0);
  assert.equal(calculateShipping(1.5), 0);
  assert.equal(calculateShipping(2.9), 0);
});

test('calculateShipping: calculates base $49 + $4/km for >= 3 km', () => {
  assert.equal(calculateShipping(3), 49 + 3 * 4); // 61
  assert.equal(calculateShipping(10), 49 + 10 * 4); // 89
});

test('calculateShipping: returns default $99 if distance is null', () => {
  assert.equal(calculateShipping(null), 99);
});

test('convertUSDToMXN: accurately converts with exchange rate', () => {
  const result = convertUSDToMXN(10, 18.5);
  assert.equal(result, 185);
});

test('calculateSubtotalMXN: aggregates items multiplied by quantity and rate', () => {
  const mockItems: CartItem[] = [
    {
      id: 1,
      product: {
        id: 1,
        title: 'Artisan Bag',
        price: 20,
        description: 'Test',
        category: 'accessories',
        image: 'https://example.com/img.jpg',
      },
      quantity: 2,
    },
    {
      id: 2,
      product: {
        id: 2,
        title: 'Minimalist Watch',
        price: 50,
        description: 'Test 2',
        category: 'watches',
        image: 'https://example.com/img2.jpg',
      },
      quantity: 1,
    },
  ];

  // 2 * (20 * 20) + 1 * (50 * 20) = 800 + 1000 = 1800
  const subtotal = calculateSubtotalMXN(mockItems, 20);
  assert.equal(subtotal, 1800);
});

test('haversineDistanceKm: returns close to 0 for identical points', () => {
  const dist = haversineDistanceKm(16.7531, -93.1156, 16.7531, -93.1156);
  assert.equal(dist, 0);
});
