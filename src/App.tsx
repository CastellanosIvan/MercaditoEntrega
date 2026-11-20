import { useState, useEffect, useCallback } from 'react';
import { Product, CartItem, Order } from './types';
import { APIService } from './services/api';
import { Header } from './components/Header';
import { CatalogView } from './components/CatalogView';
import { ScannerView } from './components/ScannerView';
import { CartView } from './components/CartView';
import { FilesView } from './components/FilesView';
import { OrdersView } from './components/OrdersView';
import { ProductDetailModal } from './components/ProductDetailModal';

export default function App() {
  const [activeTab, setActiveTab] = useState<'catalog' | 'scanner' | 'cart' | 'files' | 'orders'>('catalog');
  const [products, setProducts] = useState<Product[]>([]);
  const [items, setItems] = useState<CartItem[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [exchangeRate, setExchangeRate] = useState<number>(18.25);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [lastRemoved, setLastRemoved] = useState<CartItem | null>(null);
  const [darkMode, setDarkMode] = useState<boolean>(false);
  const [isPhoneFrame, setIsPhoneFrame] = useState<boolean>(false);

  // Inicializar tema y datos
  useEffect(() => {
    // Modo oscuro inicial
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      setDarkMode(true);
    }

    // Cargar tipo de cambio
    APIService.fetchUSDtoMXN().then((rate) => {
      setExchangeRate(rate);
    });

    // Cargar productos
    setIsLoading(true);
    APIService.fetchProducts().then((data) => {
      setProducts(data);
      setIsLoading(false);

      const params = new URLSearchParams(window.location.search);
      const productId = Number(params.get('product'));
      if (productId) {
        const shared = data.find((p) => p.id === productId);
        if (shared) {
          setSelectedProduct(shared);
        }
      }
    });

    // Cargar pedidos guardados
    const savedOrders = APIService.loadOrders();
    if (savedOrders.length > 0) {
      setOrders(savedOrders);
    }
  }, []);

  // Sincronizar clase .dark en el elemento <html>
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  // Manejo de carrito
  const handleAddToCart = useCallback((product: Product, quantity = 1) => {
    setItems((prev) => {
      const idx = prev.findIndex((item) => item.product.id === product.id);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = { ...copy[idx], quantity: copy[idx].quantity + quantity };
        return copy;
      }
      return [...prev, { id: product.id, product, quantity }];
    });
  }, []);

  const handleUpdateQuantity = useCallback((id: number, quantity: number) => {
    if (quantity <= 0) {
      setItems((prev) => {
        const itemToRemove = prev.find((it) => it.id === id);
        if (itemToRemove) {
          setLastRemoved(itemToRemove);
        }
        return prev.filter((it) => it.id !== id);
      });
    } else {
      setItems((prev) =>
        prev.map((it) => (it.id === id ? { ...it, quantity } : it))
      );
    }
  }, []);

  const handleRemoveItem = useCallback((item: CartItem) => {
    setLastRemoved(item);
    setItems((prev) => prev.filter((it) => it.id !== item.id));
  }, []);

  const handleUndoRemove = useCallback(() => {
    if (!lastRemoved) return;
    setItems((prev) => [...prev, lastRemoved]);
    setLastRemoved(null);
  }, [lastRemoved]);

  const handlePlaceOrder = useCallback((newOrder: Order) => {
    setOrders((prev) => {
      const updated = [newOrder, ...prev];
      APIService.saveOrders(updated);
      return updated;
    });
    setItems([]);
  }, []);

  const handleImportOrders = useCallback((importedOrders: Order[]) => {
    setOrders((prev) => {
      const merged = [...importedOrders, ...prev];
      APIService.saveOrders(merged);
      return merged;
    });
  }, []);

  const cartCount = items.reduce((sum, it) => sum + it.quantity, 0);

  return (
    <div
      className={`min-h-screen flex flex-col bg-stone-50 text-stone-900 dark:bg-stone-950 dark:text-stone-100 transition-colors ${
        isPhoneFrame ? 'py-6 px-4 bg-stone-200 dark:bg-stone-900 flex items-center justify-center' : ''
      }`}
    >
      {/* Top Bar Navigation */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        cartCount={cartCount}
        exchangeRate={exchangeRate}
        darkMode={darkMode}
        setDarkMode={setDarkMode}
        isPhoneFrame={isPhoneFrame}
        setIsPhoneFrame={setIsPhoneFrame}
      />

      {/* Main View Container */}
      <div
        className={
          isPhoneFrame
            ? 'relative w-[393px] h-[852px] bg-stone-50 dark:bg-stone-950 border-[10px] border-stone-800 dark:border-stone-700 rounded-[50px] shadow-2xl overflow-y-auto overflow-x-hidden flex flex-col my-4'
            : 'flex-1 flex flex-col'
        }
      >
        {/* Dynamic Island in Simulator Mode */}
        {isPhoneFrame && (
          <div className="sticky top-0 z-50 pt-2 pb-1 bg-stone-50/90 dark:bg-stone-950/90 flex justify-center backdrop-blur-md">
            <div className="w-28 h-6 bg-black rounded-full flex items-center justify-between px-3">
              <div className="w-2.5 h-2.5 bg-stone-900 rounded-full" />
              <div className="w-2.5 h-2.5 bg-stone-800 rounded-full" />
            </div>
          </div>
        )}

        <main className={`flex-1 ${isPhoneFrame ? 'pb-24' : 'pb-20 md:pb-0'}`}>
        {activeTab === 'catalog' && (
          <CatalogView
            products={products}
            isLoading={isLoading}
            exchangeRate={exchangeRate}
            isPhoneFrame={isPhoneFrame}
            onSelectProduct={(p) => setSelectedProduct(p)}
            onAddToCart={(p) => handleAddToCart(p, 1)}
          />
        )}

        {activeTab === 'scanner' && (
          <ScannerView
            products={products}
            exchangeRate={exchangeRate}
            onAddToCart={(p) => handleAddToCart(p, 1)}
            onSelectProduct={(p) => setSelectedProduct(p)}
          />
        )}

        {activeTab === 'cart' && (
          <CartView
            items={items}
            exchangeRate={exchangeRate}
            lastRemoved={lastRemoved}
            onUpdateQuantity={handleUpdateQuantity}
            onRemoveItem={handleRemoveItem}
            onUndoRemove={handleUndoRemove}
            onPlaceOrder={handlePlaceOrder}
            onGoToCatalog={() => setActiveTab('catalog')}
          />
        )}

        {activeTab === 'files' && (
          <FilesView
            orders={orders}
            onImportOrders={handleImportOrders}
          />
        )}

        {activeTab === 'orders' && (
          <OrdersView
            orders={orders}
            onGoToCatalog={() => setActiveTab('catalog')}
          />
        )}
      </main>
      </div>

      {/* Product Detail Modal with 3D Gyroscope/Tilt */}
      <ProductDetailModal
        product={selectedProduct}
        exchangeRate={exchangeRate}
        onClose={() => setSelectedProduct(null)}
        onAddToCart={(p, q) => {
          handleAddToCart(p, q || 1);
        }}
      />

      {/* Minimalist Footnote */}
      <footer className="border-t border-stone-200 dark:border-stone-800 py-8 px-4 text-center text-xs text-stone-400 dark:text-stone-500">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <p>© 2026 Mercadito. Comercio electrónico con diseño sobrio y neutral.</p>
          <div className="flex items-center gap-4 text-[11px]">
            <span>Giroscopio & 3D</span>
            <span>·</span>
            <span>Sensor GPS</span>
            <span>·</span>
            <span>Autenticación Biométrica</span>
            <span>·</span>
            <span>Open Food Facts</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
