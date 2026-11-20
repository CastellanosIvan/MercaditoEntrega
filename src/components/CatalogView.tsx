import React, { useState, useMemo } from 'react';
import { Product } from '../types';
import { formatMXN, convertUSDToMXN } from '../utils/shopLogic';
import { Search, Plus, SlidersHorizontal } from 'lucide-react';

interface CatalogViewProps {
  products: Product[];
  isLoading: boolean;
  exchangeRate: number;
  isPhoneFrame?: boolean;
  onSelectProduct: (p: Product) => void;
  onAddToCart: (p: Product) => void;
}

export const CatalogView: React.FC<CatalogViewProps> = ({
  products,
  isLoading,
  exchangeRate,
  isPhoneFrame = false,
  onSelectProduct,
  onAddToCart,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'featured' | 'price-asc' | 'price-desc' | 'rating'>('featured');

  // Categorías únicas
  const categories = useMemo(() => {
    const set = new Set(products.map((p) => p.category));
    return ['all', ...Array.from(set)];
  }, [products]);

  // Filtrado y ordenamiento
  const filteredProducts = useMemo(() => {
    let result = products.filter((p) => {
      const matchSearch =
        p.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.description.toLowerCase().includes(searchTerm.toLowerCase());
      const matchCategory = selectedCategory === 'all' || p.category === selectedCategory;
      return matchSearch && matchCategory;
    });

    if (sortBy === 'price-asc') {
      result.sort((a, b) => a.price - b.price);
    } else if (sortBy === 'price-desc') {
      result.sort((a, b) => b.price - a.price);
    } else if (sortBy === 'rating') {
      result.sort((a, b) => (b.rating?.rate || 0) - (a.rating?.rate || 0));
    }

    return result;
  }, [products, searchTerm, selectedCategory, sortBy]);

  return (
    <div className="space-y-10 pb-16">
      {/* Minimalist Editorial Hero */}
      <section className="pt-8 pb-4 text-center max-w-2xl mx-auto px-4">
        <p className="text-xs uppercase tracking-widest text-stone-500 dark:text-stone-400 font-medium mb-3">
          Colección Esencial
        </p>
        <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight text-stone-900 dark:text-stone-100 text-balance">
          Diseño sereno, funcionalidad atemporal
        </h1>
        <p className="mt-3 text-sm text-stone-600 dark:text-stone-400 max-w-lg mx-auto leading-relaxed">
          Piezas concebidas con materiales nobles y líneas limpias para un estilo de vida contemporáneo y consciente.
        </p>
      </section>

      {/* Filter and Search Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-4">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 pb-4 border-b border-stone-200 dark:border-stone-800">
          {/* Search Bar */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar en el catálogo..."
              className="w-full pl-9 pr-4 py-2 text-xs bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-md focus:outline-none focus:ring-1 focus:ring-stone-400 dark:focus:ring-stone-600 text-stone-900 dark:text-stone-100 placeholder-stone-400"
            />
          </div>

          {/* Sort selector */}
          <div className="flex items-center gap-2 self-end sm:self-auto text-xs text-stone-500 dark:text-stone-400">
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>Ordenar por:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="bg-transparent text-stone-800 dark:text-stone-200 font-medium focus:outline-none cursor-pointer"
            >
              <option value="featured" className="dark:bg-stone-900">Destacados</option>
              <option value="price-asc" className="dark:bg-stone-900">Menor precio</option>
              <option value="price-desc" className="dark:bg-stone-900">Mayor precio</option>
              <option value="rating" className="dark:bg-stone-900">Mejor valorados</option>
            </select>
          </div>
        </div>

        {/* Category Filter Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-2 scrollbar-none">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md whitespace-nowrap transition-colors cursor-pointer ${
                selectedCategory === cat
                  ? 'bg-stone-900 text-stone-50 dark:bg-stone-100 dark:text-stone-900'
                  : 'bg-white dark:bg-stone-900 text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100 border border-stone-200 dark:border-stone-800'
              }`}
            >
              {cat === 'all'
                ? 'Todos los artículos'
                : cat === "men's clothing"
                ? 'Hombre'
                : cat === "women's clothing"
                ? 'Mujer'
                : cat === 'jewelery'
                ? 'Joyería & Hogar'
                : cat === 'electronics'
                ? 'Tecnología'
                : cat}
            </button>
          ))}
        </div>
      </div>

      {/* Products Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {isLoading ? (
          <div className="py-24 text-center">
            <div className="inline-block w-6 h-6 border-2 border-stone-300 dark:border-stone-700 border-t-stone-900 dark:border-t-stone-100 rounded-full animate-spin mb-4" />
            <p className="text-xs text-stone-500">Cargando colección...</p>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="py-20 text-center border border-dashed border-stone-200 dark:border-stone-800 rounded-xl max-w-md mx-auto p-8">
            <p className="text-sm font-medium text-stone-800 dark:text-stone-200">
              No se encontraron productos
            </p>
            <p className="mt-1 text-xs text-stone-500">
              Prueba cambiando el término de búsqueda o seleccionando otra categoría.
            </p>
            <button
              onClick={() => {
                setSearchTerm('');
                setSelectedCategory('all');
              }}
              className="mt-4 px-4 py-1.5 text-xs font-medium text-stone-900 dark:text-stone-100 bg-stone-100 dark:bg-stone-800 rounded-md hover:bg-stone-200 transition-colors cursor-pointer"
            >
              Restablecer filtros
            </button>
          </div>
        ) : (
          <div
            className={`grid gap-4 ${
              isPhoneFrame ? 'grid-cols-2' : 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 sm:gap-6'
            }`}
          >
            {filteredProducts.map((product) => {
              const priceMXN = convertUSDToMXN(product.price, exchangeRate);

              return (
                <div
                  key={product.id}
                  onClick={() => onSelectProduct(product)}
                  className="group relative bg-white dark:bg-stone-900/60 rounded-lg border border-stone-200/80 dark:border-stone-800/80 p-3 sm:p-4 flex flex-col justify-between hover:border-stone-400 dark:hover:border-stone-600 transition-all duration-200 cursor-pointer"
                >
                  <div>
                    {/* Image Container */}
                    <div className="relative aspect-square w-full rounded-md bg-stone-100 dark:bg-stone-950 p-4 flex items-center justify-center overflow-hidden mb-3">
                      <img
                        src={product.image}
                        alt={product.title}
                        loading="lazy"
                        referrerPolicy="no-referrer"
                        className="max-h-full max-w-full object-contain group-hover:scale-105 transition-transform duration-300"
                      />
                    </div>

                    {/* Metadata: clean unboxed text */}
                    <div className="flex items-center gap-1.5 text-[11px] text-stone-400 dark:text-stone-500 mb-1">
                      <span className="capitalize line-clamp-1">{product.category}</span>
                      {product.rating && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span>★ {product.rating.rate}</span>
                        </>
                      )}
                    </div>

                    {/* Title */}
                    <h3 className="text-xs sm:text-sm font-medium text-stone-900 dark:text-stone-100 line-clamp-2 leading-snug group-hover:text-stone-600 dark:group-hover:text-stone-300 transition-colors">
                      {product.title}
                    </h3>
                  </div>

                  {/* Price & Fast Action */}
                  <div className="pt-3 mt-3 border-t border-stone-100 dark:border-stone-800/60 flex items-center justify-between">
                    <div>
                      <div className="text-xs sm:text-sm font-semibold text-stone-900 dark:text-stone-100 tabular-nums">
                        {formatMXN(priceMXN)}
                      </div>
                      <div className="text-[10px] text-stone-400 dark:text-stone-500 tabular-nums">
                        US${product.price.toFixed(2)}
                      </div>
                    </div>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onAddToCart(product);
                      }}
                      aria-label={`Agregar ${product.title} al carrito`}
                      className="p-1.5 rounded-md text-stone-600 dark:text-stone-300 bg-stone-100 dark:bg-stone-800 hover:bg-stone-900 hover:text-stone-50 dark:hover:bg-stone-100 dark:hover:text-stone-900 transition-colors cursor-pointer"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
