import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Product } from '../types';
import { APIService } from '../services/api';
import { convertUSDToMXN, formatMXN } from '../utils/shopLogic';
import {
  getProductBarcode,
  parseMercaditoCode,
  scanQRFromImageData,
} from '../utils/codeGenerator';
import { Camera, Search, Plus, Check, RefreshCw, Image as ImageIcon } from 'lucide-react';

interface ScannerViewProps {
  products: Product[];
  exchangeRate: number;
  onAddToCart: (p: Product) => void;
  onSelectProduct?: (p: Product) => void;
}

export const ScannerView: React.FC<ScannerViewProps> = ({
  products,
  exchangeRate,
  onAddToCart,
  onSelectProduct,
}) => {
  const [barcodeInput, setBarcodeInput] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [foundCatalogProduct, setFoundCatalogProduct] = useState<Product | null>(null);
  const [foundProduct, setFoundProduct] = useState<{
    product_name?: string;
    brands?: string;
    image_url?: string;
    categories?: string;
    barcode: string;
  } | null>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
  const [added, setAdded] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const lastScannedRef = useRef<string>('');

  const handleLookup = useCallback(
    async (codeToLookup: string) => {
      const code = codeToLookup.trim();
      if (!code) return;

      setIsSearching(true);
      setErrorMessage(null);
      setFoundProduct(null);
      setFoundCatalogProduct(null);

      // 1) Verificar si es un código QR o código de barras generado por Mercadito
      const parsed = parseMercaditoCode(code);
      if (parsed) {
        const match =
          (parsed.productId !== undefined
            ? products.find((p) => p.id === parsed.productId)
            : undefined) ||
          (parsed.barcode
            ? products.find((p) => getProductBarcode(p) === parsed.barcode)
            : undefined);

        if (match) {
          setFoundCatalogProduct(match);
          setIsSearching(false);
          return;
        }

        if (parsed.productId !== undefined && parsed.title) {
          setFoundCatalogProduct({
            id: parsed.productId,
            title: parsed.title,
            price: parsed.priceUSD ?? 39 / exchangeRate,
            description: `Producto compartido vía código Mercadito (${parsed.barcode || ''})`,
            category: parsed.category || 'general',
            image: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600&auto=format&fit=crop&q=80',
            barcode: parsed.barcode,
          });
          setIsSearching(false);
          return;
        }
      }

      // 2) Buscar en Open Food Facts
      try {
        const res = await APIService.lookupBarcode(code);
        if (res && res.product_name) {
          setFoundProduct({
            ...res,
            barcode: code,
          });
        } else {
          setErrorMessage('Producto no encontrado en Mercadito ni en Open Food Facts.');
        }
      } catch {
        setErrorMessage('Error al consultar el servicio de códigos de barras.');
      } finally {
        setIsSearching(false);
      }
    },
    [products, exchangeRate]
  );

  // Iniciar/Detener cámara y leer QR / códigos de barras en tiempo real
  useEffect(() => {
    let stream: MediaStream | null = null;
    let rafId = 0;
    let active = true;

    const scanFrame = async () => {
      if (!active || !videoRef.current || !canvasRef.current) return;
      const video = videoRef.current;
      if (video.readyState === video.HAVE_ENOUGH_DATA && video.videoWidth > 0) {
        const canvas = canvasRef.current;
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

          // Native BarcodeDetector (Chrome / Edge / Safari moderno)
          if ('BarcodeDetector' in window) {
            try {
              const Detector = (window as unknown as { BarcodeDetector: new (opts: { formats: string[] }) => { detect: (img: HTMLCanvasElement) => Promise<Array<{ rawValue: string }>> } }).BarcodeDetector;
              const detector = new Detector({
                formats: ['qr_code', 'code_128', 'ean_13', 'ean_8', 'upc_e'],
              });
              const codes = await detector.detect(canvas);
              if (codes.length > 0 && codes[0].rawValue && codes[0].rawValue !== lastScannedRef.current) {
                lastScannedRef.current = codes[0].rawValue;
                setBarcodeInput(codes[0].rawValue);
                setCameraActive(false);
                void handleLookup(codes[0].rawValue);
                return;
              }
            } catch {
              // fallback a jsQR
            }
          }

          // Fallback universal con jsQR
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const decoded = scanQRFromImageData(imageData);
          if (decoded && decoded !== lastScannedRef.current) {
            lastScannedRef.current = decoded;
            setBarcodeInput(decoded);
            setCameraActive(false);
            void handleLookup(decoded);
            return;
          }
        }
      }
      rafId = requestAnimationFrame(scanFrame);
    };

    if (cameraActive) {
      lastScannedRef.current = '';
      navigator.mediaDevices
        ?.getUserMedia({ video: { facingMode: 'environment' } })
        .then((s) => {
          stream = s;
          setHasCameraPermission(true);
          if (videoRef.current) {
            videoRef.current.srcObject = s;
          }
          rafId = requestAnimationFrame(scanFrame);
        })
        .catch(() => {
          setHasCameraPermission(false);
          setCameraActive(false);
        });
    }

    return () => {
      active = false;
      if (rafId) cancelAnimationFrame(rafId);
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [cameraActive, handleLookup]);

  const handleImageUploadScan = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.drawImage(img, 0, 0);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const decoded = scanQRFromImageData(imageData);
      if (decoded) {
        setBarcodeInput(decoded);
        void handleLookup(decoded);
      } else {
        setErrorMessage('No se detectó ningún código QR válido en la imagen.');
      }
      URL.revokeObjectURL(img.src);
    };
    img.src = URL.createObjectURL(file);
  };

  const handleAddFoundProduct = () => {
    if (!foundProduct) return;

    const fixedPriceMXN = 39.0;
    const priceUSD = fixedPriceMXN / exchangeRate;

    const newProduct: Product = {
      id: Math.abs(parseInt(foundProduct.barcode.slice(-6), 10) || Math.floor(Math.random() * 900000) + 100000),
      title: foundProduct.product_name || 'Producto Escaneado',
      price: priceUSD,
      description: `${foundProduct.brands || 'Abarrotes'} · Código: ${foundProduct.barcode}`,
      category: 'abarrotes',
      image: foundProduct.image_url || 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=500&auto=format&fit=crop&q=80',
      rating: { rate: 4.8, count: 18 },
      barcode: foundProduct.barcode,
    };

    onAddToCart(newProduct);
    setAdded(true);
    setTimeout(() => {
      setAdded(false);
      setFoundProduct(null);
      setBarcodeInput('');
    }, 2000);
  };

  const handleAddCatalogProduct = () => {
    if (!foundCatalogProduct) return;
    onAddToCart(foundCatalogProduct);
    setAdded(true);
    setTimeout(() => {
      setAdded(false);
    }, 1800);
  };

  const sampleCodes = [
    { code: '7509990001015', label: 'Bolso Tote (EAN Mercadito)' },
    { code: '7501055300075', label: 'Galletas Marías 170g' },
    { code: '3017620422003', label: 'Nutella 350g' },
    { code: '7501000111208', label: 'Coca-Cola 600ml' },
  ];

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-8">
      <div className="text-center space-y-2">
        <p className="text-xs uppercase tracking-widest text-stone-500 font-medium">
          Sensor de Cámara, QR & Base de Datos
        </p>
        <h2 className="text-2xl font-semibold tracking-tight text-stone-900 dark:text-stone-100">
          Escáner de QR y Códigos de Barra
        </h2>
        <p className="text-xs text-stone-500 max-w-md mx-auto">
          Escanea códigos QR/EAN generados por Mercadito (iPhone o Web) o consulta abarrotes en Open Food Facts.
        </p>
      </div>

      {/* Camera / Viewfinder Box */}
      <div className="relative bg-white dark:bg-stone-900 rounded-xl border border-stone-200 dark:border-stone-800 p-6 flex flex-col items-center justify-center overflow-hidden">
        <canvas ref={canvasRef} className="hidden" />
        {cameraActive ? (
          <div className="relative w-full aspect-video max-w-md bg-black rounded-lg overflow-hidden flex items-center justify-center">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center">
              <div className="w-56 h-36 border-2 border-stone-100/70 rounded-lg relative overflow-hidden">
                <div className="absolute left-0 right-0 h-[2px] bg-stone-100/90 shadow-[0_0_8px_rgba(255,255,255,0.8)] animate-pulse top-1/2 -translate-y-1/2" />
              </div>
              <span className="text-[11px] text-white/90 mt-2 bg-black/50 px-2 py-0.5 rounded">
                Apunta hacia el QR o código de barras
              </span>
            </div>
          </div>
        ) : (
          <div className="w-full max-w-md py-10 px-6 flex flex-col items-center text-center bg-stone-50 dark:bg-stone-950/50 rounded-lg border border-dashed border-stone-200 dark:border-stone-800">
            <Camera className="w-8 h-8 text-stone-400 mb-3" />
            <h3 className="text-xs font-semibold text-stone-800 dark:text-stone-200">
              Escaneo óptico en tiempo real
            </h3>
            <p className="text-[11px] text-stone-500 max-w-xs mt-1 mb-4">
              Activa la cámara, sube una imagen con QR o introduce manualmente el código del producto.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-2">
              <button
                onClick={() => setCameraActive(true)}
                className="px-4 py-2 text-xs font-medium text-stone-900 dark:text-stone-100 bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 hover:bg-stone-100 dark:hover:bg-stone-700 rounded-md transition-colors cursor-pointer"
              >
                Iniciar visor de cámara
              </button>
              <label className="px-4 py-2 text-xs font-medium text-stone-700 dark:text-stone-300 bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 hover:bg-stone-100 dark:hover:bg-stone-700 rounded-md transition-colors cursor-pointer inline-flex items-center gap-1.5">
                <ImageIcon className="w-3.5 h-3.5" />
                <span>Leer QR desde imagen</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUploadScan}
                  className="hidden"
                />
              </label>
            </div>
            {hasCameraPermission === false && (
              <p className="text-[11px] text-stone-500 mt-2">
                Permiso de cámara no disponible. Puedes usar una imagen QR o los códigos abajo.
              </p>
            )}
          </div>
        )}

        {cameraActive && (
          <button
            onClick={() => setCameraActive(false)}
            className="mt-4 text-xs text-stone-500 hover:text-stone-800 dark:hover:text-stone-200 transition-colors cursor-pointer"
          >
            Cerrar cámara
          </button>
        )}
      </div>

      {/* Manual Input Form */}
      <div className="bg-white dark:bg-stone-900 rounded-xl border border-stone-200 dark:border-stone-800 p-6 space-y-4">
        <label htmlFor="barcode-input" className="block text-xs font-medium text-stone-700 dark:text-stone-300">
          Entrada manual de código de barras o enlace QR
        </label>
        <div className="flex gap-2">
          <input
            id="barcode-input"
            type="text"
            value={barcodeInput}
            onChange={(e) => setBarcodeInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleLookup(barcodeInput);
            }}
            placeholder="Ejemplo: 7509990001015 o mercadito://product/101"
            className="flex-1 px-3.5 py-2 text-xs bg-stone-50 dark:bg-stone-950 border border-stone-200 dark:border-stone-800 rounded-md focus:outline-none focus:ring-1 focus:ring-stone-400 font-mono text-stone-900 dark:text-stone-100"
          />
          <button
            onClick={() => handleLookup(barcodeInput)}
            disabled={isSearching || !barcodeInput.trim()}
            className="px-4 py-2 text-xs font-medium text-white bg-stone-900 hover:bg-stone-800 dark:bg-stone-100 dark:text-stone-900 dark:hover:bg-stone-200 rounded-md disabled:opacity-50 transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            {isSearching ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Search className="w-3.5 h-3.5" />
            )}
            <span>Buscar</span>
          </button>
        </div>

        <div className="pt-2">
          <p className="text-[11px] text-stone-400 dark:text-stone-500 mb-2">
            Códigos de prueba recomendados:
          </p>
          <div className="flex flex-wrap gap-2">
            {sampleCodes.map((item) => (
              <button
                key={item.code}
                onClick={() => {
                  setBarcodeInput(item.code);
                  handleLookup(item.code);
                }}
                className="text-xs px-2.5 py-1 rounded bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 hover:text-stone-900 dark:hover:text-stone-100 hover:bg-stone-200 dark:hover:bg-stone-700 transition-colors cursor-pointer"
              >
                <span className="font-mono text-[10px] text-stone-400 mr-1.5">{item.code}</span>
                {item.label}
              </button>
            ))}
          </div>
        </div>

        {errorMessage && (
          <div className="p-3 text-xs text-stone-700 dark:text-stone-300 bg-stone-100 dark:bg-stone-800/80 rounded-md border border-stone-200 dark:border-stone-700">
            {errorMessage}
          </div>
        )}
      </div>

      {/* Found Mercadito Catalog Product */}
      {foundCatalogProduct && (
        <div className="bg-white dark:bg-stone-900 rounded-xl border border-stone-200 dark:border-stone-800 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-fade-in">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-stone-50 dark:bg-stone-950 rounded-lg p-1 border border-stone-100 dark:border-stone-800 flex items-center justify-center shrink-0">
              <img
                src={foundCatalogProduct.image}
                alt={foundCatalogProduct.title}
                className="max-h-full max-w-full object-contain"
              />
            </div>

            <div className="space-y-1">
              <span className="text-[10px] font-mono text-stone-400 dark:text-stone-500">
                MERCADITO · EAN: {getProductBarcode(foundCatalogProduct)}
              </span>
              <h4 className="text-sm font-semibold text-stone-900 dark:text-stone-100">
                {foundCatalogProduct.title}
              </h4>
              <p className="text-xs text-stone-500">
                <span className="font-semibold text-stone-900 dark:text-stone-100">
                  {formatMXN(convertUSDToMXN(foundCatalogProduct.price, exchangeRate))}
                </span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {onSelectProduct && (
              <button
                onClick={() => onSelectProduct(foundCatalogProduct)}
                className="px-3 py-2 text-xs font-medium rounded-md border border-stone-200 dark:border-stone-700 text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors cursor-pointer"
              >
                Ver detalle
              </button>
            )}
            <button
              onClick={handleAddCatalogProduct}
              className={`px-4 py-2 text-xs font-medium rounded-md transition-colors flex items-center gap-1.5 cursor-pointer ${
                added
                  ? 'bg-stone-800 text-stone-100 dark:bg-stone-100 dark:text-stone-900'
                  : 'bg-stone-900 text-stone-50 hover:bg-stone-800 dark:bg-stone-100 dark:text-stone-900 dark:hover:bg-stone-200'
              }`}
            >
              {added ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>Agregado</span>
                </>
              ) : (
                <>
                  <Plus className="w-3.5 h-3.5" />
                  <span>Agregar</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Found Open Food Facts Product */}
      {foundProduct && (
        <div className="bg-white dark:bg-stone-900 rounded-xl border border-stone-200 dark:border-stone-800 p-5 flex items-center justify-between gap-4 animate-fade-in">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-stone-50 dark:bg-stone-950 rounded-lg p-1 border border-stone-100 dark:border-stone-800 flex items-center justify-center shrink-0">
              {foundProduct.image_url ? (
                <img
                  src={foundProduct.image_url}
                  alt={foundProduct.product_name}
                  className="max-h-full max-w-full object-contain"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-xs text-stone-400 font-mono">
                  IMG
                </div>
              )}
            </div>

            <div className="space-y-1">
              <span className="text-[10px] font-mono text-stone-400 dark:text-stone-500">
                EAN: {foundProduct.barcode}
              </span>
              <h4 className="text-sm font-semibold text-stone-900 dark:text-stone-100">
                {foundProduct.product_name}
              </h4>
              <p className="text-xs text-stone-500">
                {foundProduct.brands || 'Mercancía general'} · Precio estándar:{' '}
                <span className="font-semibold text-stone-900 dark:text-stone-100">
                  {formatMXN(39.0)}
                </span>
              </p>
            </div>
          </div>

          <button
            onClick={handleAddFoundProduct}
            className={`px-4 py-2 text-xs font-medium rounded-md transition-colors flex items-center gap-1.5 cursor-pointer ${
              added
                ? 'bg-stone-800 text-stone-100 dark:bg-stone-100 dark:text-stone-900'
                : 'bg-stone-900 text-stone-50 hover:bg-stone-800 dark:bg-stone-100 dark:text-stone-900 dark:hover:bg-stone-200'
            }`}
          >
            {added ? (
              <>
                <Check className="w-3.5 h-3.5" />
                <span>Agregado</span>
              </>
            ) : (
              <>
                <Plus className="w-3.5 h-3.5" />
                <span>Agregar</span>
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
};
