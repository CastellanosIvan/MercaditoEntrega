import React, { useState, useEffect, useRef } from 'react';
import { Product } from '../types';
import { formatMXN, formatUSD, convertUSDToMXN } from '../utils/shopLogic';
import {
  getProductBarcode,
  getProductDeepLink,
  generateQRDataUrl,
  renderBarcodeToSvg,
} from '../utils/codeGenerator';
import { X, Check, Star, Share2, QrCode, Copy, Download } from 'lucide-react';

interface ProductDetailModalProps {
  product: Product | null;
  exchangeRate: number;
  onClose: () => void;
  onAddToCart: (product: Product, quantity?: number) => void;
}

export const ProductDetailModal: React.FC<ProductDetailModalProps> = ({
  product,
  exchangeRate,
  onClose,
  onAddToCart,
}) => {
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);
  const [copiedMsg, setCopiedMsg] = useState<string | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const cardRef = useRef<HTMLDivElement>(null);
  const barcodeSvgRef = useRef<SVGSVGElement>(null);

  // Escuchar giroscopio en móviles o mouse en computadoras
  useEffect(() => {
    const handleOrientation = (e: DeviceOrientationEvent) => {
      if (e.gamma !== null && e.beta !== null) {
        const x = Math.max(-15, Math.min(15, (e.gamma || 0) * 0.4));
        const y = Math.max(-15, Math.min(15, ((e.beta || 0) - 45) * 0.4));
        setTilt({ x, y });
      }
    };

    if (window.DeviceOrientationEvent) {
      window.addEventListener('deviceorientation', handleOrientation);
    }
    return () => {
      if (window.DeviceOrientationEvent) {
        window.removeEventListener('deviceorientation', handleOrientation);
      }
    };
  }, []);

  // Generar QR y código de barras únicos del producto
  useEffect(() => {
    if (!product) return;
    setQuantity(1);
    setAdded(false);

    const deepLink = getProductDeepLink(product);
    const barcodeValue = getProductBarcode(product);

    generateQRDataUrl(deepLink)
      .then((url) => setQrDataUrl(url))
      .catch(() => setQrDataUrl(''));

    if (barcodeSvgRef.current) {
      try {
        renderBarcodeToSvg(barcodeSvgRef.current, barcodeValue);
      } catch {
        // ignore invalid SVG state
      }
    }
  }, [product]);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left - rect.width / 2;
    const y = e.clientY - rect.top - rect.height / 2;
    const rotateY = (x / (rect.width / 2)) * 12;
    const rotateX = -(y / (rect.height / 2)) * 12;
    setTilt({ x: rotateY, y: rotateX });
  };

  const handleMouseLeave = () => {
    setTilt({ x: 0, y: 0 });
  };

  if (!product) return null;

  const priceMXN = convertUSDToMXN(product.price, exchangeRate);
  const barcodeValue = getProductBarcode(product);
  const deepLink = getProductDeepLink(product);
  const shareUrl = `${window.location.origin}/?product=${product.id}`;

  const handleAdd = () => {
    onAddToCart(product, quantity);
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: product.title,
          text: `Mira ${product.title} (${formatMXN(priceMXN)}) en Mercadito`,
          url: shareUrl,
        });
        return;
      } catch {
        // fall back to clipboard
      }
    }
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopiedMsg('Enlace del producto copiado');
      setTimeout(() => setCopiedMsg(null), 2500);
    } catch {
      setCopiedMsg(deepLink);
      setTimeout(() => setCopiedMsg(null), 3500);
    }
  };

  const handleCopyDeepLink = async () => {
    try {
      await navigator.clipboard.writeText(deepLink);
      setCopiedMsg('Enlace mercadito:// copiado para iPhone');
      setTimeout(() => setCopiedMsg(null), 2500);
    } catch {
      // ignore
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={product.title}
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 dark:bg-stone-950/80 backdrop-blur-sm animate-fade-in overflow-y-auto"
    >
      <div
        className="relative w-full max-w-3xl bg-white dark:bg-stone-900 rounded-xl border border-stone-200 dark:border-stone-800 shadow-2xl overflow-hidden my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          aria-label="Cerrar modal"
          className="absolute top-4 right-4 z-10 p-2 text-stone-400 hover:text-stone-900 dark:hover:text-stone-100 rounded-full hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="grid grid-cols-1 md:grid-cols-2">
          {/* Visual Container with 3D Gyroscope/Tilt + QR & Barcode */}
          <div className="p-6 md:p-8 bg-stone-100 dark:bg-stone-950/60 flex flex-col items-center justify-between gap-6 border-b md:border-b-0 md:border-r border-stone-200 dark:border-stone-800">
            <div
              ref={cardRef}
              onMouseMove={handleMouseMove}
              onMouseLeave={handleMouseLeave}
              className="w-full flex flex-col items-center justify-center select-none cursor-grab active:cursor-grabbing"
              style={{ perspective: '1000px' }}
            >
              <div
                className="relative w-full aspect-square max-w-[210px] flex items-center justify-center transition-transform duration-100 ease-out"
                style={{
                  transform: `rotateX(${tilt.y}deg) rotateY(${tilt.x}deg) scale3d(1.02, 1.02, 1.02)`,
                  transformStyle: 'preserve-3d',
                }}
              >
                <img
                  src={product.image}
                  alt={product.title}
                  referrerPolicy="no-referrer"
                  className="max-h-full max-w-full object-contain drop-shadow-md rounded-md"
                />
              </div>
              <p className="mt-3 text-[11px] text-stone-400 dark:text-stone-500 text-center tracking-wide">
                Efecto 3D interactivo · Mueve el cursor o inclina tu dispositivo
              </p>
            </div>

            {/* Product QR & Barcode Card (compatible with Mercadito iOS Scanner) */}
            <div className="w-full bg-white rounded-lg border border-stone-200 p-3.5 text-stone-900 space-y-2.5">
              <div className="flex items-center justify-between text-[11px] font-medium text-stone-600">
                <span className="flex items-center gap-1.5">
                  <QrCode className="w-3.5 h-3.5" />
                  QR & Código de Barras
                </span>
                <span className="font-mono text-[10px] text-stone-400">EAN {barcodeValue}</span>
              </div>

              <div className="flex items-center gap-3">
                {qrDataUrl && (
                  <img
                    src={qrDataUrl}
                    alt={`QR de ${product.title}`}
                    className="w-24 h-24 shrink-0 border border-stone-200 rounded p-0.5 bg-white"
                  />
                )}
                <div className="flex-1 min-w-0 flex flex-col items-center justify-center overflow-hidden">
                  <svg ref={barcodeSvgRef} className="max-w-full h-auto" />
                </div>
              </div>

              <div className="flex items-center justify-between gap-2 pt-1 border-t border-stone-100 text-[10px] text-stone-500">
                <span>Escaneable con Mercadito iPhone</span>
                <div className="flex items-center gap-2">
                  {qrDataUrl && (
                    <a
                      href={qrDataUrl}
                      download={`qr-mercadito-${product.id}.png`}
                      className="inline-flex items-center gap-1 hover:text-stone-900 font-medium"
                    >
                      <Download className="w-3 h-3" />
                      QR
                    </a>
                  )}
                  <button
                    type="button"
                    onClick={handleCopyDeepLink}
                    className="inline-flex items-center gap-1 hover:text-stone-900 font-medium cursor-pointer"
                  >
                    <Copy className="w-3 h-3" />
                    URI
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Product Details */}
          <div className="p-6 md:p-8 flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-xs text-stone-500 dark:text-stone-400">
                <span className="capitalize">{product.category}</span>
                <span aria-hidden="true">·</span>
                <span>Ref: #{product.id}</span>
              </div>

              <h2 className="text-lg md:text-xl font-semibold text-stone-900 dark:text-stone-100 leading-snug">
                {product.title}
              </h2>

              {product.rating && (
                <div className="flex items-center gap-2 text-xs text-stone-600 dark:text-stone-400">
                  <div className="flex items-center text-stone-800 dark:text-stone-200 font-medium">
                    <Star className="w-3.5 h-3.5 fill-current mr-1 text-stone-800 dark:text-stone-200" />
                    <span>{product.rating.rate}</span>
                  </div>
                  <span aria-hidden="true">·</span>
                  <span>{product.rating.count} reseñas verificadas</span>
                </div>
              )}

              <div className="pt-2">
                <div className="text-2xl font-bold tracking-tight text-stone-900 dark:text-stone-100 tabular-nums">
                  {formatMXN(priceMXN)}
                </div>
                <div className="text-xs text-stone-400 dark:text-stone-500 tabular-nums">
                  {formatUSD(product.price)} · IVA incluido
                </div>
              </div>

              <p className="text-xs text-stone-600 dark:text-stone-300 leading-relaxed line-clamp-5">
                {product.description}
              </p>
            </div>

            <div className="pt-6 border-t border-stone-200 dark:border-stone-800 mt-6 space-y-3">
              <div className="flex items-center gap-3">
                <div className="flex items-center border border-stone-200 dark:border-stone-700 rounded-md">
                  <button
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="px-3 py-1.5 text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-l-md transition-colors cursor-pointer"
                    aria-label="Disminuir cantidad"
                  >
                    -
                  </button>
                  <span className="px-3 py-1.5 text-xs font-semibold tabular-nums text-stone-800 dark:text-stone-200">
                    {quantity}
                  </span>
                  <button
                    onClick={() => setQuantity(quantity + 1)}
                    className="px-3 py-1.5 text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-r-md transition-colors cursor-pointer"
                    aria-label="Aumentar cantidad"
                  >
                    +
                  </button>
                </div>

                <button
                  onClick={handleAdd}
                  className={`flex-1 py-2 px-4 rounded-md text-xs font-medium transition-all duration-150 flex items-center justify-center gap-2 cursor-pointer ${
                    added
                      ? 'bg-stone-800 text-stone-100 dark:bg-stone-100 dark:text-stone-900'
                      : 'bg-stone-900 text-stone-50 hover:bg-stone-800 dark:bg-stone-100 dark:text-stone-900 dark:hover:bg-stone-200'
                  }`}
                >
                  {added ? (
                    <>
                      <Check className="w-4 h-4" />
                      <span>Agregado al carrito</span>
                    </>
                  ) : (
                    <span>Agregar al carrito</span>
                  )}
                </button>
              </div>

              <button
                onClick={handleShare}
                className="w-full py-2 text-stone-500 hover:text-stone-900 dark:text-stone-400 dark:hover:text-stone-200 text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span>Compartir producto</span>
              </button>

              {copiedMsg && (
                <p className="text-[11px] text-center text-stone-500 dark:text-stone-400 font-mono truncate">
                  {copiedMsg}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
