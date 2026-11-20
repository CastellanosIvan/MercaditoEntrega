import { CartItem } from '../types';

// Almacén central (Tuxtla Gutiérrez, Chiapas: 16.7531, -93.1156)
export const WAREHOUSE_COORDS = {
  lat: 16.7531,
  lng: -93.1156,
  name: 'Almacén Central Mercadito (Tuxtla Gutiérrez)',
};

/**
 * Calcula la distancia en kilómetros entre dos coordenadas usando la fórmula de Haversine.
 */
export function haversineDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Radio de la Tierra en km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
}

/**
 * Tarifa de envío:
 * Menos de 3 km: Gratis ($0 MXN)
 * Mayor o igual: $49 base + $4 por km
 * Si no hay distancia disponible: $99 MXN estándar
 */
export function calculateShipping(distanceKm: number | null): number {
  if (distanceKm === null || distanceKm === undefined) {
    return 99;
  }
  if (distanceKm < 3) {
    return 0;
  }
  return Math.round(49 + distanceKm * 4);
}

/**
 * Conversión de USD a MXN
 */
export function convertUSDToMXN(usdPrice: number, exchangeRate: number): number {
  return Math.round(usdPrice * exchangeRate * 100) / 100;
}

/**
 * Calcula el subtotal en MXN de los artículos en el carrito
 */
export function calculateSubtotalMXN(items: CartItem[], exchangeRate: number): number {
  return items.reduce((sum, item) => {
    const itemMXN = convertUSDToMXN(item.product.price, exchangeRate);
    return sum + itemMXN * item.quantity;
  }, 0);
}

/**
 * Formatea un número a pesos mexicanos (MXN)
 */
export function formatMXN(amount: number): string {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

/**
 * Formatea un número a dólares (USD)
 */
export function formatUSD(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}
