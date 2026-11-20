import React, { useState, useEffect } from 'react';
import { CartItem, PaymentMethod, Order } from '../types';
import {
  formatMXN,
  formatUSD,
  convertUSDToMXN,
  calculateSubtotalMXN,
  calculateShipping,
  haversineDistanceKm,
  WAREHOUSE_COORDS,
} from '../utils/shopLogic';
import {
  Trash2,
  MapPin,
  RotateCcw,
  ShieldCheck,
  CheckCircle2,
  ArrowRight,
  Fingerprint,
} from 'lucide-react';

interface CartViewProps {
  items: CartItem[];
  exchangeRate: number;
  lastRemoved: CartItem | null;
  onUpdateQuantity: (id: number, quantity: number) => void;
  onRemoveItem: (item: CartItem) => void;
  onUndoRemove: () => void;
  onPlaceOrder: (order: Order) => void;
  onGoToCatalog: () => void;
}

export const CartView: React.FC<CartViewProps> = ({
  items,
  exchangeRate,
  lastRemoved,
  onUpdateQuantity,
  onRemoveItem,
  onUndoRemove,
  onPlaceOrder,
  onGoToCatalog,
}) => {
  // Estado de ubicación GPS
  const [distanceKm, setDistanceKm] = useState<number | null>(null);
  const [address, setAddress] = useState<string>('Av. Central Poniente 554, Tuxtla Gutiérrez, Chiapas');
  const [isLocating, setIsLocating] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);

  // Modal de checkout
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod>('Apple Pay');
  const [isBiometricAuthenticating, setIsBiometricAuthenticating] = useState(false);
  const [biometricSuccess, setBiometricSuccess] = useState(false);
  const [checkoutCompleteOrder, setCheckoutCompleteOrder] = useState<Order | null>(null);

  // Escuchar acelerómetro para deshacer agitando (Shake gesture)
  useEffect(() => {
    let lastX = 0, lastY = 0, lastZ = 0;
    let lastTime = 0;

    const handleMotion = (event: DeviceMotionEvent) => {
      const current = event.accelerationIncludingGravity;
      if (!current || current.x === null || current.y === null || current.z === null) return;

      const now = Date.now();
      if (now - lastTime > 100) {
        const diffTime = now - lastTime;
        lastTime = now;

        const speed =
          (Math.abs(current.x + current.y + current.z - lastX - lastY - lastZ) / diffTime) * 10000;

        if (speed > 800 && lastRemoved) {
          onUndoRemove();
        }

        lastX = current.x;
        lastY = current.y;
        lastZ = current.z;
      }
    };

    if (window.DeviceMotionEvent) {
      window.addEventListener('devicemotion', handleMotion);
    }
    return () => {
      if (window.DeviceMotionEvent) {
        window.removeEventListener('devicemotion', handleMotion);
      }
    };
  }, [lastRemoved, onUndoRemove]);

  // Cálculos de costos
  const subtotalMXN = calculateSubtotalMXN(items, exchangeRate);
  const shippingMXN = items.length > 0 ? calculateShipping(distanceKm) : 0;
  const totalMXN = subtotalMXN + shippingMXN;

  // Obtener geolocalización GPS real o presets
  const handleDetectLocation = () => {
    setIsLocating(true);
    setLocationError(null);

    if (!navigator.geolocation) {
      setLocationError('Tu navegador no soporta geolocalización.');
      setIsLocating(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const userLat = pos.coords.latitude;
        const userLng = pos.coords.longitude;
        const d = haversineDistanceKm(
          userLat,
          userLng,
          WAREHOUSE_COORDS.lat,
          WAREHOUSE_COORDS.lng
        );
        setDistanceKm(d);

        // Geocodificación inversa sencilla
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${userLat}&lon=${userLng}`
          );
          if (res.ok) {
            const data = await res.json();
            if (data && data.display_name) {
              setAddress(data.display_name.split(',').slice(0, 3).join(', '));
            }
          }
        } catch {
          setAddress(`Lat: ${userLat.toFixed(3)}, Lng: ${userLng.toFixed(3)}`);
        }
        setIsLocating(false);
      },
      () => {
        // En caso de denegación de permisos o falla en sandbox, calculamos una ubicación de prueba cercana
        const testDistance = 2.4; // Menos de 3 km = Envío Gratis
        setDistanceKm(testDistance);
        setAddress('Av. Central Poniente 554, Tuxtla Gutiérrez, Chiapas');
        setLocationError('Permiso GPS no concedido; se aplicó ubicación local demo.');
        setIsLocating(false);
      },
      { timeout: 8000 }
    );
  };

  const handleSetPresetLocation = (presetName: string, km: number, mockAddr: string) => {
    setDistanceKm(km);
    setAddress(mockAddr);
    setLocationError(null);
  };

  // Confirmar y pagar con autenticación biométrica
  const handlePay = () => {
    setIsBiometricAuthenticating(true);

    // Simula escaneo biométrico (Face ID / Touch ID / Passkey)
    setTimeout(() => {
      const newOrder: Order = {
        id: `ORD-${Date.now().toString(36).toUpperCase()}`,
        date: new Date().toISOString(),
        items: [...items],
        subtotalMXN,
        shippingMXN,
        totalMXN,
        method: selectedMethod,
        address: address.trim() || 'Dirección estándar de entrega',
        status: 'Completado',
      };

      onPlaceOrder(newOrder);
      setCheckoutCompleteOrder(newOrder);
      setIsBiometricAuthenticating(false);
    }, 500);
  };

  if (items.length === 0 && !checkoutCompleteOrder) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center space-y-4">
        <p className="text-sm font-medium text-stone-800 dark:text-stone-200">
          Tu carrito de compras está vacío
        </p>
        <p className="text-xs text-stone-500 max-w-sm mx-auto">
          Explora nuestro catálogo curado o utiliza el lector óptico de códigos para incorporar artículos.
        </p>
        <button
          onClick={onGoToCatalog}
          className="px-5 py-2 text-xs font-medium text-stone-900 dark:text-stone-100 bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 hover:bg-stone-100 dark:hover:bg-stone-700 rounded-md transition-colors cursor-pointer"
        >
          Ver catálogo
        </button>

        {lastRemoved && (
          <div className="pt-8">
            <button
              onClick={onUndoRemove}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs text-stone-600 dark:text-stone-300 bg-stone-100 dark:bg-stone-800 rounded-md hover:bg-stone-200 transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Restaurar último artículo ({lastRemoved.product.title.slice(0, 20)}...)</span>
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
      {/* Undo Notification Bar */}
      {lastRemoved && (
        <div className="mb-6 p-3 bg-stone-100 dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-lg flex items-center justify-between text-xs animate-fade-in">
          <span className="text-stone-600 dark:text-stone-400">
            Has eliminado «{lastRemoved.product.title.slice(0, 32)}…». Agita tu dispositivo para deshacer.
          </span>
          <button
            onClick={onUndoRemove}
            className="font-medium text-stone-900 dark:text-stone-100 hover:underline flex items-center gap-1 cursor-pointer"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Deshacer</span>
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left column: Cart Items (8 cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-stone-200 dark:border-stone-800">
            <h2 className="text-lg font-semibold text-stone-900 dark:text-stone-100">
              Artículos seleccionados ({items.reduce((acc, i) => acc + i.quantity, 0)})
            </h2>
            <button
              onClick={onGoToCatalog}
              className="text-xs text-stone-500 hover:text-stone-900 dark:hover:text-stone-200 transition-colors cursor-pointer"
            >
              + Continuar comprando
            </button>
          </div>

          <div className="divide-y divide-stone-100 dark:divide-stone-800/80">
            {items.map((item) => {
              const itemMXN = convertUSDToMXN(item.product.price, exchangeRate);
              const totalLineMXN = itemMXN * item.quantity;

              return (
                <div key={item.id} className="py-4 flex gap-4 items-center">
                  <div className="w-16 h-16 bg-stone-100 dark:bg-stone-900 rounded-md p-1.5 shrink-0 flex items-center justify-center border border-stone-200/50 dark:border-stone-800">
                    <img
                      src={item.product.image}
                      alt={item.product.title}
                      className="max-h-full max-w-full object-contain"
                    />
                  </div>

                  <div className="flex-1 min-w-0">
                    <h3 className="text-xs sm:text-sm font-medium text-stone-900 dark:text-stone-100 line-clamp-1">
                      {item.product.title}
                    </h3>
                    <p className="text-[11px] text-stone-400 capitalize mt-0.5">
                      {item.product.category} · {formatMXN(itemMXN)} c/u
                    </p>

                    <div className="flex items-center gap-3 mt-2">
                      <div className="flex items-center border border-stone-200 dark:border-stone-700 rounded">
                        <button
                          onClick={() => onUpdateQuantity(item.id, item.quantity - 1)}
                          className="px-2 py-0.5 text-xs text-stone-500 hover:text-stone-900 dark:text-stone-400 dark:hover:text-stone-100 cursor-pointer"
                          aria-label="Restar una unidad"
                        >
                          -
                        </button>
                        <span className="px-2 text-xs font-semibold tabular-nums text-stone-800 dark:text-stone-200">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => onUpdateQuantity(item.id, item.quantity + 1)}
                          className="px-2 py-0.5 text-xs text-stone-500 hover:text-stone-900 dark:text-stone-400 dark:hover:text-stone-100 cursor-pointer"
                          aria-label="Sumar una unidad"
                        >
                          +
                        </button>
                      </div>

                      <button
                        onClick={() => onRemoveItem(item)}
                        className="text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 p-1 transition-colors cursor-pointer"
                        aria-label={`Eliminar ${item.product.title}`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <div className="text-xs sm:text-sm font-semibold text-stone-900 dark:text-stone-100 tabular-nums">
                      {formatMXN(totalLineMXN)}
                    </div>
                    <div className="text-[10px] text-stone-400 tabular-nums">
                      {formatUSD(item.product.price * item.quantity)}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right column: GPS Shipping & Summary (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          {/* SENSOR GPS: Cálculo de Envío */}
          <div className="bg-white dark:bg-stone-900 rounded-xl border border-stone-200 dark:border-stone-800 p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-stone-500" />
                <h3 className="text-xs font-semibold text-stone-900 dark:text-stone-100">
                  Cálculo de Envío por GPS
                </h3>
              </div>
              <span className="text-[10px] text-stone-400">Sensor CoreLocation</span>
            </div>

            <p className="text-xs text-stone-500">
              Cálculo dinámico respecto a nuestro almacén en Tuxtla Gutiérrez ($49 + $4/km). Gratis a menos de 3 km.
            </p>

            <div className="space-y-2">
              <button
                onClick={handleDetectLocation}
                disabled={isLocating}
                className="w-full py-2 px-3 text-xs font-medium bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-900 dark:text-stone-100 rounded-md transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                <MapPin className="w-3.5 h-3.5" />
                <span>{isLocating ? 'Calculando coordenadas...' : 'Usar mi ubicación GPS actual'}</span>
              </button>

              {/* Presets de prueba para comodidad */}
              <div className="flex items-center gap-1.5 pt-1 text-[11px] text-stone-400">
                <span>Pruebas:</span>
                <button
                  onClick={() =>
                    handleSetPresetLocation(
                      'Tuxtla Local',
                      1.8,
                      'Parque de la Marimba, Tuxtla Gutiérrez, Chiapas'
                    )
                  }
                  className="hover:underline text-stone-600 dark:text-stone-300 cursor-pointer"
                >
                  Tuxtla (1.8 km - Gratis)
                </button>
                <span>·</span>
                <button
                  onClick={() =>
                    handleSetPresetLocation(
                      'CDMX',
                      840,
                      'Paseo de la Reforma, Ciudad de México'
                    )
                  }
                  className="hover:underline text-stone-600 dark:text-stone-300 cursor-pointer"
                >
                  CDMX (Nacional)
                </button>
              </div>

              {locationError && (
                <p className="text-[11px] text-stone-500">{locationError}</p>
              )}

              {distanceKm !== null && (
                <div className="pt-2 text-xs border-t border-stone-100 dark:border-stone-800 space-y-1">
                  <div className="flex justify-between text-stone-600 dark:text-stone-400">
                    <span>Distancia calculada:</span>
                    <span className="font-semibold text-stone-900 dark:text-stone-100 tabular-nums">
                      {distanceKm < 3 ? `${distanceKm} km (Local)` : `${distanceKm.toFixed(1)} km`}
                    </span>
                  </div>
                  <div className="flex justify-between text-stone-600 dark:text-stone-400">
                    <span>Destino de entrega:</span>
                    <span className="font-medium text-stone-900 dark:text-stone-100 truncate max-w-[200px]">
                      {address}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Order Summary Box */}
          <div className="bg-white dark:bg-stone-900 rounded-xl border border-stone-200 dark:border-stone-800 p-5 space-y-4">
            <h3 className="text-xs font-semibold text-stone-900 dark:text-stone-100 uppercase tracking-wider">
              Resumen del Pedido
            </h3>

            <div className="space-y-2 text-xs text-stone-600 dark:text-stone-400 divide-y divide-stone-100 dark:divide-stone-800">
              <div className="flex justify-between pb-1">
                <span>Subtotal ({items.reduce((a, b) => a + b.quantity, 0)} artículos)</span>
                <span className="font-medium text-stone-900 dark:text-stone-100 tabular-nums">
                  {formatMXN(subtotalMXN)}
                </span>
              </div>

              <div className="flex justify-between py-1">
                <span>Tarifa de entrega</span>
                <span className="font-medium text-stone-900 dark:text-stone-100 tabular-nums">
                  {shippingMXN === 0 ? 'Gratis ($0.00)' : formatMXN(shippingMXN)}
                </span>
              </div>

              <div className="flex justify-between pt-2 text-sm font-semibold text-stone-900 dark:text-stone-100">
                <span>Total a pagar</span>
                <span className="text-base tabular-nums">{formatMXN(totalMXN)}</span>
              </div>
            </div>

            <button
              onClick={() => setIsCheckoutOpen(true)}
              className="w-full py-3 px-4 text-xs font-medium text-white bg-stone-900 hover:bg-stone-800 dark:bg-stone-100 dark:text-stone-900 dark:hover:bg-stone-200 rounded-md transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>Proceder al pago</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>

            <div className="flex items-center justify-center gap-2 text-[11px] text-stone-400">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Transacción cifrada · Autenticación biométrica</span>
            </div>
          </div>
        </div>
      </div>

      {/* Checkout Modal / Bottom Sheet */}
      {isCheckoutOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 dark:bg-stone-950/80 backdrop-blur-sm animate-fade-in"
        >
          <div className="relative w-full max-w-md bg-white dark:bg-stone-900 rounded-xl border border-stone-200 dark:border-stone-800 shadow-2xl p-6 space-y-6">
            <div className="flex items-center justify-between pb-3 border-b border-stone-200 dark:border-stone-800">
              <div>
                <h3 className="text-base font-semibold text-stone-900 dark:text-stone-100">
                  Finalizar compra
                </h3>
                <p className="text-xs text-stone-500">Pasarela segura Mercadito</p>
              </div>
              <button
                onClick={() => setIsCheckoutOpen(false)}
                className="text-xs text-stone-400 hover:text-stone-800 dark:hover:text-stone-200 cursor-pointer"
              >
                Cancelar
              </button>
            </div>

            {/* Dirección de entrega */}
            <div className="space-y-1.5">
              <label htmlFor="checkout-address" className="text-xs font-medium text-stone-700 dark:text-stone-300">
                Dirección de entrega
              </label>
              <input
                id="checkout-address"
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-stone-50 dark:bg-stone-950 border border-stone-200 dark:border-stone-800 rounded-md text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-1 focus:ring-stone-400"
              />
            </div>

            {/* Método de Pago */}
            <div className="space-y-2">
              <span className="text-xs font-medium text-stone-700 dark:text-stone-300">
                Método de pago
              </span>
              <div className="grid grid-cols-3 gap-2">
                {(['Apple Pay', 'PayPal', 'Tarjeta Bancaria'] as PaymentMethod[]).map((m) => (
                  <button
                    key={m}
                    onClick={() => setSelectedMethod(m)}
                    className={`py-2 px-1 text-center text-xs font-medium rounded-md border transition-colors cursor-pointer ${
                      selectedMethod === m
                        ? 'border-stone-900 bg-stone-900 text-stone-50 dark:border-stone-100 dark:bg-stone-100 dark:text-stone-900'
                        : 'border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-950 text-stone-600 dark:text-stone-400'
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>

            {/* Breakdown */}
            <div className="bg-stone-50 dark:bg-stone-950/70 p-3 rounded-md text-xs space-y-1">
              <div className="flex justify-between text-stone-500">
                <span>Total productos:</span>
                <span>{formatMXN(subtotalMXN)}</span>
              </div>
              <div className="flex justify-between text-stone-500">
                <span>Costo de envío:</span>
                <span>{shippingMXN === 0 ? 'Gratis' : formatMXN(shippingMXN)}</span>
              </div>
              <div className="flex justify-between font-semibold text-stone-900 dark:text-stone-100 pt-1 border-t border-stone-200 dark:border-stone-800">
                <span>Monto total:</span>
                <span className="tabular-nums">{formatMXN(totalMXN)}</span>
              </div>
            </div>

            {/* Biometric trigger button */}
            <div className="space-y-3">
              <button
                onClick={handlePay}
                disabled={isBiometricAuthenticating}
                className="w-full py-3 px-4 text-xs font-medium text-white bg-stone-900 hover:bg-stone-800 dark:bg-stone-100 dark:text-stone-900 dark:hover:bg-stone-200 rounded-md transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                {isBiometricAuthenticating ? (
                  <>
                    <Fingerprint className="w-4 h-4 animate-pulse text-stone-300 dark:text-stone-700" />
                    <span>Verificando Face ID / Touch ID...</span>
                  </>
                ) : (
                  <>
                    <Fingerprint className="w-4 h-4" />
                    <span>Pagar con {selectedMethod}</span>
                  </>
                )}
              </button>

              <p className="text-[11px] text-stone-400 text-center">
                Se solicitará autenticación biométrica (Sensor Face ID / Passkey) antes de autorizar el cobro.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Success Order Confirmation Modal */}
      {checkoutCompleteOrder && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 dark:bg-stone-950/80 backdrop-blur-sm animate-fade-in"
        >
          <div className="relative w-full max-w-md bg-white dark:bg-stone-900 rounded-xl border border-stone-200 dark:border-stone-800 shadow-2xl p-6 text-center space-y-4">
            <div className="w-12 h-12 bg-stone-100 dark:bg-stone-800 rounded-full flex items-center justify-center mx-auto text-stone-900 dark:text-stone-100">
              <CheckCircle2 className="w-6 h-6" />
            </div>

            <div>
              <p className="text-xs uppercase tracking-widest text-stone-400 font-medium">
                Pago Autorizado
              </p>
              <h3 className="text-lg font-semibold text-stone-900 dark:text-stone-100 mt-1">
                ¡Gracias por tu compra!
              </h3>
              <p className="text-xs text-stone-500 mt-1">
                Pedido <span className="font-mono">{checkoutCompleteOrder.id}</span> generado y registrado exitosamente.
              </p>
            </div>

            <div className="bg-stone-50 dark:bg-stone-950 p-4 rounded-lg text-left text-xs space-y-1.5 border border-stone-200/60 dark:border-stone-800">
              <div className="flex justify-between text-stone-500">
                <span>Método:</span>
                <span className="font-medium text-stone-800 dark:text-stone-200">{checkoutCompleteOrder.method}</span>
              </div>
              <div className="flex justify-between text-stone-500">
                <span>Envío a:</span>
                <span className="font-medium text-stone-800 dark:text-stone-200 truncate max-w-[200px]">
                  {checkoutCompleteOrder.address}
                </span>
              </div>
              <div className="flex justify-between text-stone-900 dark:text-stone-100 font-semibold pt-1 border-t border-stone-200 dark:border-stone-800">
                <span>Total abonado:</span>
                <span className="tabular-nums">{formatMXN(checkoutCompleteOrder.totalMXN)}</span>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => {
                  setCheckoutCompleteOrder(null);
                  setIsCheckoutOpen(false);
                  onGoToCatalog();
                }}
                className="w-full py-2.5 px-4 text-xs font-medium text-white bg-stone-900 hover:bg-stone-800 dark:bg-stone-100 dark:text-stone-900 dark:hover:bg-stone-200 rounded-md transition-colors cursor-pointer"
              >
                Volver al catálogo
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
