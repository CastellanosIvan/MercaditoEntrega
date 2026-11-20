import React from 'react';
import { ShoppingBag, Sun, Moon, Store, ScanBarcode, Folder, Package, Smartphone, Monitor } from 'lucide-react';

interface HeaderProps {
  activeTab: 'catalog' | 'scanner' | 'cart' | 'files' | 'orders';
  setActiveTab: (tab: 'catalog' | 'scanner' | 'cart' | 'files' | 'orders') => void;
  cartCount: number;
  exchangeRate: number;
  darkMode: boolean;
  setDarkMode: (val: boolean) => void;
  isPhoneFrame: boolean;
  setIsPhoneFrame: (val: boolean) => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  cartCount,
  exchangeRate,
  darkMode,
  setDarkMode,
  isPhoneFrame,
  setIsPhoneFrame,
}) => {
  return (
    <>
      {/* Desktop & Mobile Top Bar */}
      <header className="sticky top-0 z-40 bg-stone-50/90 dark:bg-stone-950/90 backdrop-blur-md border-b border-stone-200 dark:border-stone-800 transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-8">
          {/* Zone 1: Brand wordmark */}
          <div className="flex items-center gap-4 shrink-0">
            <button
              onClick={() => setActiveTab('catalog')}
              className="text-xl font-bold tracking-tight text-stone-900 dark:text-stone-100 hover:opacity-80 transition-opacity flex items-center gap-2 cursor-pointer"
              aria-label="Ir al inicio de Mercadito"
            >
              <span>Mercadito</span>
            </button>
            <span className="hidden xl:inline text-xs text-stone-400 dark:text-stone-500 font-normal">
              1 USD ≈ ${exchangeRate.toFixed(2)} MXN
            </span>
          </div>

          {/* Zone 2: 5 clean single-line text navigation links (Desktop) */}
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium" aria-label="Navegación principal">
            <button
              onClick={() => setActiveTab('catalog')}
              className={`px-2.5 py-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                activeTab === 'catalog'
                  ? 'text-stone-900 dark:text-stone-100 font-semibold border-b-2 border-stone-900 dark:border-stone-100 -mb-[2px]'
                  : 'text-stone-500 hover:text-stone-900 dark:text-stone-400 dark:hover:text-stone-200'
              }`}
            >
              Catálogo
            </button>

            <button
              onClick={() => setActiveTab('scanner')}
              className={`px-2.5 py-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                activeTab === 'scanner'
                  ? 'text-stone-900 dark:text-stone-100 font-semibold border-b-2 border-stone-900 dark:border-stone-100 -mb-[2px]'
                  : 'text-stone-500 hover:text-stone-900 dark:text-stone-400 dark:hover:text-stone-200'
              }`}
            >
              Escanear
            </button>

            <button
              onClick={() => setActiveTab('cart')}
              className={`px-2.5 py-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'cart'
                  ? 'text-stone-900 dark:text-stone-100 font-semibold border-b-2 border-stone-900 dark:border-stone-100 -mb-[2px]'
                  : 'text-stone-500 hover:text-stone-900 dark:text-stone-400 dark:hover:text-stone-200'
              }`}
            >
              <span>Carrito</span>
              {cartCount > 0 && (
                <span className="text-[11px] font-semibold text-stone-900 dark:text-stone-100 tabular-nums">
                  ({cartCount})
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('files')}
              className={`px-2.5 py-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                activeTab === 'files'
                  ? 'text-stone-900 dark:text-stone-100 font-semibold border-b-2 border-stone-900 dark:border-stone-100 -mb-[2px]'
                  : 'text-stone-500 hover:text-stone-900 dark:text-stone-400 dark:hover:text-stone-200'
              }`}
            >
              Archivos
            </button>

            <button
              onClick={() => setActiveTab('orders')}
              className={`px-2.5 py-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                activeTab === 'orders'
                  ? 'text-stone-900 dark:text-stone-100 font-semibold border-b-2 border-stone-900 dark:border-stone-100 -mb-[2px]'
                  : 'text-stone-500 hover:text-stone-900 dark:text-stone-400 dark:hover:text-stone-200'
              }`}
            >
              Pedidos
            </button>
          </nav>

          {/* Zone 3: 1 primary action + theme toggle + simulator toggle */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <button
              onClick={() => setIsPhoneFrame(!isPhoneFrame)}
              className="hidden lg:flex items-center gap-1.5 p-2 text-stone-500 hover:text-stone-900 dark:text-stone-400 dark:hover:text-stone-100 rounded-lg transition-colors cursor-pointer text-xs"
              title={isPhoneFrame ? 'Volver a pantalla completa' : 'Emular iPhone en pantalla'}
              aria-label={isPhoneFrame ? 'Volver a pantalla completa' : 'Emular iPhone en pantalla'}
            >
              {isPhoneFrame ? <Monitor className="w-4 h-4" /> : <Smartphone className="w-4 h-4" />}
              <span className="hidden xl:inline">{isPhoneFrame ? 'Escritorio' : 'Emulador iPhone'}</span>
            </button>

            <button
              onClick={() => setDarkMode(!darkMode)}
              className="p-2 text-stone-500 hover:text-stone-900 dark:text-stone-400 dark:hover:text-stone-100 rounded-lg transition-colors cursor-pointer"
              aria-label={darkMode ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
            >
              {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>

            <button
              onClick={() => setActiveTab('cart')}
              className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-medium text-stone-900 dark:text-stone-100 bg-stone-200/80 dark:bg-stone-800/80 hover:bg-stone-300/80 dark:hover:bg-stone-700/80 rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              aria-label={`Ver carrito con ${cartCount} artículos`}
            >
              <ShoppingBag className="w-3.5 h-3.5" />
              <span className="tabular-nums font-semibold">{cartCount}</span>
            </button>
          </div>
        </div>
      </header>

      {/* Mobile & Simulator Bottom Tab Bar */}
      <nav
        className={`${
          isPhoneFrame ? 'fixed bottom-4 left-1/2 -translate-x-1/2 w-[370px] rounded-b-[40px]' : 'md:hidden fixed bottom-0 left-0 right-0'
        } z-40 bg-stone-50/95 dark:bg-stone-950/95 backdrop-blur-md border-t border-stone-200 dark:border-stone-800 py-2 px-2 flex items-center justify-around`}
        aria-label="Pestañas móviles"
      >
        <button
          onClick={() => setActiveTab('catalog')}
          className={`flex flex-col items-center gap-0.5 text-[10px] font-medium transition-colors py-1 px-2 cursor-pointer ${
            activeTab === 'catalog'
              ? 'text-stone-900 dark:text-stone-100 font-semibold'
              : 'text-stone-400 dark:text-stone-500'
          }`}
        >
          <Store className="w-4 h-4" />
          <span>Tienda</span>
        </button>

        <button
          onClick={() => setActiveTab('scanner')}
          className={`flex flex-col items-center gap-0.5 text-[10px] font-medium transition-colors py-1 px-2 cursor-pointer ${
            activeTab === 'scanner'
              ? 'text-stone-900 dark:text-stone-100 font-semibold'
              : 'text-stone-400 dark:text-stone-500'
          }`}
        >
          <ScanBarcode className="w-4 h-4" />
          <span>Escanear</span>
        </button>

        <button
          onClick={() => setActiveTab('cart')}
          className={`relative flex flex-col items-center gap-0.5 text-[10px] font-medium transition-colors py-1 px-2 cursor-pointer ${
            activeTab === 'cart'
              ? 'text-stone-900 dark:text-stone-100 font-semibold'
              : 'text-stone-400 dark:text-stone-500'
          }`}
        >
          <ShoppingBag className="w-4 h-4" />
          <span>Carrito</span>
          {cartCount > 0 && (
            <span className="absolute top-0 right-1 w-3.5 h-3.5 bg-stone-900 dark:bg-stone-100 text-stone-50 dark:text-stone-900 rounded-full text-[9px] font-bold flex items-center justify-center tabular-nums">
              {cartCount}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('files')}
          className={`flex flex-col items-center gap-0.5 text-[10px] font-medium transition-colors py-1 px-2 cursor-pointer ${
            activeTab === 'files'
              ? 'text-stone-900 dark:text-stone-100 font-semibold'
              : 'text-stone-400 dark:text-stone-500'
          }`}
        >
          <Folder className="w-4 h-4" />
          <span>Archivos</span>
        </button>

        <button
          onClick={() => setActiveTab('orders')}
          className={`flex flex-col items-center gap-0.5 text-[10px] font-medium transition-colors py-1 px-2 cursor-pointer ${
            activeTab === 'orders'
              ? 'text-stone-900 dark:text-stone-100 font-semibold'
              : 'text-stone-400 dark:text-stone-500'
          }`}
        >
          <Package className="w-4 h-4" />
          <span>Pedidos</span>
        </button>
      </nav>
    </>
  );
};
