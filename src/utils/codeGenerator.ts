import QRCode from 'qrcode';
import JsBarcode from 'jsbarcode';
import jsQR from 'jsqr';
import { Product } from '../types';

export function ean13CheckDigit(twelveDigits: string): string {
  if (!/^\d{12}$/.test(twelveDigits)) return '0';
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    const d = Number(twelveDigits[i]);
    sum += i % 2 === 0 ? d : d * 3;
  }
  return String((10 - (sum % 10)) % 10);
}

export function barcodeStringForProductId(id: number): string {
  const normalized = Math.abs(Math.trunc(id)) % 1_000_000;
  const base12 = `750999${String(normalized).padStart(6, '0')}`;
  return base12 + ean13CheckDigit(base12);
}

export function getProductBarcode(product: Product): string {
  if (product.barcode && product.barcode.trim().length > 0) {
    return product.barcode.trim();
  }
  return barcodeStringForProductId(product.id);
}

export function getProductDeepLink(product: Product): string {
  const barcode = getProductBarcode(product);
  const params = new URLSearchParams({
    code: barcode,
    p: product.price.toFixed(2),
    t: product.title.slice(0, 60),
    c: product.category,
  });
  return `mercadito://product/${product.id}?${params.toString()}`;
}

export interface ParsedMercaditoCode {
  productId?: number;
  barcode?: string;
  title?: string;
  priceUSD?: number;
  category?: string;
}

export function parseMercaditoCode(raw: string): ParsedMercaditoCode | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  if (trimmed.toLowerCase().startsWith('mercadito://product/')) {
    try {
      const normalized = trimmed.replace(/^mercadito:\/\//i, 'https://');
      const url = new URL(normalized);
      const idStr = url.pathname.replace(/^\//, '').split('/')[0];
      const productId = /^\d+$/.test(idStr) ? Number(idStr) : undefined;
      const code = url.searchParams.get('code') || undefined;
      const p = url.searchParams.get('p');
      const priceUSD = p !== null && !Number.isNaN(Number(p)) ? Number(p) : undefined;
      const title = url.searchParams.get('t') || undefined;
      const category = url.searchParams.get('c') || undefined;
      if (productId !== undefined || code) {
        return { productId, barcode: code, title, priceUSD, category };
      }
    } catch {
      // ignore invalid URL
    }
  }

  if (/^https?:\/\//i.test(trimmed)) {
    try {
      const url = new URL(trimmed);
      const prodParam = url.searchParams.get('product');
      if (prodParam && /^\d+$/.test(prodParam)) {
        const productId = Number(prodParam);
        return {
          productId,
          barcode: barcodeStringForProductId(productId),
        };
      }
    } catch {
      // ignore invalid URL
    }
  }

  if (/^750999\d{7}$/.test(trimmed)) {
    const idSlice = trimmed.slice(6, 12);
    return {
      productId: Number(idSlice),
      barcode: trimmed,
    };
  }

  return null;
}

export async function generateQRDataUrl(payload: string): Promise<string> {
  return QRCode.toDataURL(payload, {
    width: 240,
    margin: 2,
    errorCorrectionLevel: 'M',
    color: {
      dark: '#111111',
      light: '#ffffff',
    },
  });
}

export function renderBarcodeToSvg(svgElement: SVGSVGElement, code: string): void {
  JsBarcode(svgElement, code, {
    format: 'CODE128',
    lineColor: '#111111',
    background: '#ffffff',
    width: 2,
    height: 60,
    displayValue: true,
    fontSize: 12,
    margin: 8,
  });
}

export function scanQRFromImageData(imageData: ImageData): string | null {
  const result = jsQR(imageData.data, imageData.width, imageData.height, {
    inversionAttempts: 'attemptBoth',
  });
  return result?.data ?? null;
}
