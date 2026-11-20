import React, { useState } from 'react';
import { Order } from '../types';
import { formatMXN } from '../utils/shopLogic';
import { Receipt, X, Printer, PackageCheck, ShoppingBag } from 'lucide-react';

interface OrdersViewProps {
  orders: Order[];
  onGoToCatalog: () => void;
}

export const OrdersView: React.FC<OrdersViewProps> = ({ orders, onGoToCatalog }) => {
  const [selectedReceiptOrder, setSelectedReceiptOrder] = useState<Order | null>(null);

  if (orders.length === 0) {
    return (
      <div className="max-w-md mx-auto px-4 py-20 text-center space-y-4">
        <div className="w-12 h-12 bg-stone-100 dark:bg-stone-800 rounded-full flex items-center justify-center mx-auto text-stone-500">
          <ShoppingBag className="w-6 h-6" />
        </div>
        <h3 className="text-sm font-medium text-stone-900 dark:text-stone-100">
          No tienes pedidos registrados
        </h3>
        <p className="text-xs text-stone-500">
          Tus compras finalizadas y recibos fiscales aparecerán aquí automáticamente.
        </p>
        <button
          onClick={onGoToCatalog}
          className="px-4 py-2 text-xs font-medium text-stone-900 dark:text-stone-100 bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 hover:bg-stone-100 dark:hover:bg-stone-700 rounded-md transition-colors cursor-pointer"
        >
          Explorar catálogo
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">
      {/* Title */}
      <div className="text-center space-y-2">
        <p className="text-xs uppercase tracking-widest text-stone-500 font-medium">
          Historial de Compras
        </p>
        <h2 className="text-2xl font-semibold tracking-tight text-stone-900 dark:text-stone-100">
          Mis Pedidos
        </h2>
        <p className="text-xs text-stone-500 max-w-md mx-auto">
          Consulta el estado de tus entregas y descarga tus comprobantes en formato digital.
        </p>
      </div>

      {/* Orders List */}
      <div className="bg-white dark:bg-stone-900 rounded-xl border border-stone-200 dark:border-stone-800 divide-y divide-stone-100 dark:divide-stone-800 overflow-hidden">
        {orders.map((order) => (
          <div key={order.id} className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-semibold text-stone-900 dark:text-stone-100">
                  {order.id}
                </span>
                <span className="text-[11px] text-stone-400">·</span>
                <span className="text-[11px] text-stone-500">
                  {new Date(order.date).toLocaleDateString('es-MX', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  })}
                </span>
                <span className="text-[11px] text-stone-400">·</span>
                <span className="text-[11px] text-stone-600 dark:text-stone-400">
                  {order.status}
                </span>
              </div>

              <p className="text-xs text-stone-500">
                {order.items.reduce((acc, i) => acc + i.quantity, 0)} artículos · Pago con{' '}
                <span className="font-medium text-stone-700 dark:text-stone-300">
                  {order.method}
                </span>
              </p>

              <p className="text-[11px] text-stone-400 truncate max-w-sm">
                Entrega: {order.address}
              </p>
            </div>

            <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-stone-100 dark:border-stone-800">
              <div className="text-left sm:text-right">
                <div className="text-sm font-semibold text-stone-900 dark:text-stone-100 tabular-nums">
                  {formatMXN(order.totalMXN)}
                </div>
                <div className="text-[10px] text-stone-400">IVA y flete incluidos</div>
              </div>

              <button
                onClick={() => setSelectedReceiptOrder(order)}
                className="px-3 py-1.5 text-xs font-medium text-stone-800 dark:text-stone-200 bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 rounded-md transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <Receipt className="w-3.5 h-3.5" />
                <span>Ver recibo</span>
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Printable Receipt Modal (Matching ReceiptPDF.swift) */}
      {selectedReceiptOrder && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 dark:bg-stone-950/80 backdrop-blur-sm animate-fade-in"
        >
          <div className="relative w-full max-w-md bg-white dark:bg-stone-900 rounded-xl border border-stone-200 dark:border-stone-800 shadow-2xl p-6 space-y-6">
            <div className="flex justify-between items-center pb-3 border-b border-stone-200 dark:border-stone-800">
              <div className="flex items-center gap-2">
                <PackageCheck className="w-4 h-4 text-stone-700 dark:text-stone-300" />
                <h3 className="text-xs font-semibold text-stone-900 dark:text-stone-100 uppercase tracking-wider">
                  Comprobante Fiscal Digital
                </h3>
              </div>
              <button
                onClick={() => setSelectedReceiptOrder(null)}
                className="text-stone-400 hover:text-stone-800 dark:hover:text-stone-200 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Receipt Body */}
            <div className="bg-stone-50 dark:bg-stone-950 p-5 rounded-lg border border-stone-200/60 dark:border-stone-800 space-y-4 font-mono text-xs">
              <div className="text-center border-b border-stone-200 dark:border-stone-800 pb-3">
                <span className="font-bold text-sm tracking-tight font-sans text-stone-900 dark:text-stone-100 block">
                  Mercadito
                </span>
                <span className="text-[11px] text-stone-500 block">Comercio Electrónico S.A. de C.V.</span>
                <span className="text-[10px] text-stone-400 block">
                  Folio: {selectedReceiptOrder.id}
                </span>
                <span className="text-[10px] text-stone-400 block">
                  {new Date(selectedReceiptOrder.date).toLocaleString('es-MX')}
                </span>
              </div>

              <div className="space-y-1 text-[11px] text-stone-600 dark:text-stone-400">
                <div>Método de cobro: {selectedReceiptOrder.method}</div>
                <div className="truncate">Entrega: {selectedReceiptOrder.address}</div>
              </div>

              <div className="divide-y divide-stone-200 dark:divide-stone-800 text-[11px]">
                {selectedReceiptOrder.items.map((it) => {
                  const itemsUSDTotal = selectedReceiptOrder.items.reduce(
                    (acc, curr) => acc + curr.product.price * curr.quantity,
                    0
                  );
                  const effectiveRate = itemsUSDTotal > 0 ? selectedReceiptOrder.subtotalMXN / itemsUSDTotal : 18.25;
                  const lineTotal = it.product.price * it.quantity * effectiveRate;

                  return (
                    <div key={it.id} className="py-1.5 flex justify-between gap-2">
                      <span className="truncate">
                        {it.quantity}x {it.product.title}
                      </span>
                      <span className="shrink-0 tabular-nums">
                        {formatMXN(lineTotal)}
                      </span>
                    </div>
                  );
                })}
              </div>

              <div className="pt-2 border-t border-stone-200 dark:border-stone-800 space-y-1 text-[11px]">
                <div className="flex justify-between text-stone-500">
                  <span>Subtotal:</span>
                  <span className="tabular-nums">
                    {formatMXN(selectedReceiptOrder.subtotalMXN)}
                  </span>
                </div>
                <div className="flex justify-between text-stone-500">
                  <span>Envío:</span>
                  <span className="tabular-nums">
                    {selectedReceiptOrder.shippingMXN === 0
                      ? 'Gratis'
                      : formatMXN(selectedReceiptOrder.shippingMXN)}
                  </span>
                </div>
                <div className="flex justify-between font-bold text-sm text-stone-900 dark:text-stone-100 pt-1 border-t border-stone-300 dark:border-stone-700">
                  <span>TOTAL:</span>
                  <span className="tabular-nums">
                    {formatMXN(selectedReceiptOrder.totalMXN)}
                  </span>
                </div>
              </div>

              <p className="text-[10px] text-stone-400 text-center pt-2">
                Este comprobante fue emitido conforme a la directiva de comercio electrónico.
              </p>
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              <button
                onClick={() => window.print()}
                className="flex-1 py-2 text-xs font-medium text-stone-900 dark:text-stone-100 bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 rounded-md transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Imprimir / Guardar PDF</span>
              </button>
              <button
                onClick={() => setSelectedReceiptOrder(null)}
                className="px-4 py-2 text-xs font-medium text-white bg-stone-900 hover:bg-stone-800 dark:bg-stone-100 dark:text-stone-900 dark:hover:bg-stone-200 rounded-md transition-colors cursor-pointer"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
