import { Product, Order } from '../types';

// Catálogo curado elegante con estética minimalista y neutra para fallback instantáneo y robustez
export const CURATED_FALLBACK_PRODUCTS: Product[] = [
  {
    id: 101,
    title: 'Bolso Tote en Cuero Grano Arena',
    price: 88.0,
    description: 'Confeccionado a mano en cuero de curtición vegetal con acabados en tono arena natural y herrajes de latón cepillado.',
    category: "women's clothing",
    image: 'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=600&auto=format&fit=crop&q=80',
    rating: { rate: 4.8, count: 124 }
  },
  {
    id: 102,
    title: 'Reloj Bauhaus Automático Cerámica Marfil',
    price: 195.0,
    description: 'Esfera limpia sin números, bisel de acero quirúrgico mate y correa de gamuza taupe. Movimiento suizo automático.',
    category: 'jewelery',
    image: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600&auto=format&fit=crop&q=80',
    rating: { rate: 4.9, count: 89 }
  },
  {
    id: 103,
    title: 'Chaqueta Kimono Lino Natural Crudo',
    price: 110.0,
    description: 'Corte desestructurado en lino europeo puro teñido con tintes minerales. Botones de cuerno reciclado.',
    category: "men's clothing",
    image: 'https://images.unsplash.com/photo-1591047139829-d91aecb6caea?w=600&auto=format&fit=crop&q=80',
    rating: { rate: 4.7, count: 62 }
  },
  {
    id: 104,
    title: 'Altavoz Escultural Concreto y Madera de Nogal',
    price: 145.0,
    description: 'Cuerpo de microcemento acústico moldeado artesanalmente, transductor de alta fidelidad y rejilla de nogal oscuro.',
    category: 'electronics',
    image: 'https://images.unsplash.com/photo-1545454675-3531b543be5d?w=600&auto=format&fit=crop&q=80',
    rating: { rate: 4.9, count: 215 }
  },
  {
    id: 105,
    title: 'Suéter Cuello Redondo Lana Merino Alabastro',
    price: 76.0,
    description: 'Punto fino de merino australiano extra suave. Calidez liviana con caída relajada y ribetes acanalados discretos.',
    category: "men's clothing",
    image: 'https://images.unsplash.com/photo-1620799140408-edc6dcb6d633?w=600&auto=format&fit=crop&q=80',
    rating: { rate: 4.6, count: 98 }
  },
  {
    id: 106,
    title: 'Vela Aromática de Cera de Soya & Resina Oliban',
    price: 34.0,
    description: 'En vasija de gres porcelánico hecha a mano. Notas secas de cedro, vetiver y resina de incienso silvestre.',
    category: 'jewelery',
    image: 'https://images.unsplash.com/photo-1603006905003-be475563bc59?w=600&auto=format&fit=crop&q=80',
    rating: { rate: 4.9, count: 180 }
  },
  {
    id: 107,
    title: 'Auriculares Sobre-Oreja Grafito Mate',
    price: 160.0,
    description: 'Cancelación activa de ruido híbrida, transductores de berilio de 40mm y almohadillas viscoelásticas recubiertas de tela técnica.',
    category: 'electronics',
    image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600&auto=format&fit=crop&q=80',
    rating: { rate: 4.8, count: 340 }
  },
  {
    id: 108,
    title: 'Jarrón Minimalista Cerámica Ahumada',
    price: 52.0,
    description: 'Silueta arquitectónica modelada a torno con textura arenada porosa. Ideal para flores secas o ramas minimalistas.',
    category: 'jewelery',
    image: 'https://images.unsplash.com/photo-1578749556568-bc2c40e68b61?w=600&auto=format&fit=crop&q=80',
    rating: { rate: 4.7, count: 47 }
  }
];

export const APIService = {
  /**
   * Obtiene productos de Fake Store API combinados con la colección curada minimalista
   */
  async fetchProducts(): Promise<Product[]> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);
      
      const res = await fetch('https://fakestoreapi.com/products', {
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (res.ok) {
        const data: Product[] = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          // Unir con productos curados para un catálogo enriquecido y de estética impecable
          return [...CURATED_FALLBACK_PRODUCTS, ...data];
        }
      }
    } catch {
      // Fallback silencioso y elegante
    }
    return CURATED_FALLBACK_PRODUCTS;
  },

  /**
   * Consulta el tipo de cambio USD a MXN en ExchangeRate-API
   */
  async fetchUSDtoMXN(): Promise<number> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);
      
      const res = await fetch('https://open.er-api.com/v6/latest/USD', {
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (res.ok) {
        const data = await res.json();
        if (data && data.rates && data.rates.MXN) {
          return data.rates.MXN;
        }
      }
    } catch {
      // Default de respaldo
    }
    return 18.25;
  },

  /**
   * Consulta producto por código de barras en Open Food Facts
   */
  async lookupBarcode(code: string): Promise<{
    product_name?: string;
    brands?: string;
    image_url?: string;
    categories?: string;
  } | null> {
    try {
      const cleanCode = code.trim();
      const url = `https://world.openfoodfacts.org/api/v2/product/${cleanCode}.json?fields=product_name,brands,image_url,categories`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        if (data.status === 1 && data.product) {
          return {
            product_name: data.product.product_name || 'Producto verificado',
            brands: data.product.brands || 'Marca reconocida',
            image_url: data.product.image_url,
            categories: data.product.categories,
          };
        }
      }
    } catch {
      // Si falla, permitimos fallback
    }

    // Fallbacks para códigos de demostración conocidos
    if (code.includes('7501055300075')) {
      return {
        product_name: 'Galletas Marías Tradicionales 170g',
        brands: 'Gamesa',
        image_url: 'https://images.openfoodfacts.org/images/products/750/105/530/0075/front_es.3.400.jpg',
        categories: 'Snacks, Galletas',
      };
    }
    if (code.includes('3017620422003')) {
      return {
        product_name: 'Nutella Crema de Avellana y Cacao',
        brands: 'Ferrero',
        image_url: 'https://images.openfoodfacts.org/images/products/301/762/042/2003/front_fr.519.400.jpg',
        categories: 'Untables dulces',
      };
    }
    if (code.includes('7501000111208')) {
      return {
        product_name: 'Bebida Refrescante Cola Sin Azúcar 600ml',
        brands: 'Coca-Cola',
        image_url: 'https://images.openfoodfacts.org/images/products/750/100/011/1208/front_es.7.400.jpg',
        categories: 'Bebidas',
      };
    }

    return null;
  },

  // Persistencia de pedidos en localStorage
  loadOrders(): Order[] {
    try {
      const raw = localStorage.getItem('mercadito_orders');
      if (raw) {
        return JSON.parse(raw);
      }
    } catch {
      // Ignorar errores de parseo
    }
    return [];
  },

  saveOrders(orders: Order[]): void {
    try {
      localStorage.setItem('mercadito_orders', JSON.stringify(orders));
    } catch {
      // storage quota o privado
    }
  }
};
