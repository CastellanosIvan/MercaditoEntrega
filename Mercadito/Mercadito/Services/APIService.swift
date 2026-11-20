import Foundation

/// Todos los servicios web de terceros (JSON) que consume la app.
enum APIError: LocalizedError {
    case badResponse(Int)
    case notFound
    case invalidCode
    var errorDescription: String? {
        switch self {
        case .badResponse(let code): "El servidor respondió con código \(code)"
        case .notFound: "No se encontró el producto"
        case .invalidCode: "El código ingresado no es válido"
        }
    }
}

struct APIService {
    static let shared = APIService()
    private let session: URLSession = {
        let config = URLSessionConfiguration.default
        config.timeoutIntervalForRequest = 8
        return URLSession(configuration: config)
    }()
    private let decoder = JSONDecoder()

    /// Catálogo curado minimalista integrado para respuesta inmediata y soporte sin conexión.
    static let curatedProducts: [Product] = [
        Product(
            id: 101,
            title: "Bolso Tote en Cuero Grano Arena",
            price: 88.0,
            description: "Confeccionado a mano en cuero de curtición vegetal con acabados en tono arena natural y herrajes de latón cepillado.",
            category: "women's clothing",
            image: URL(string: "https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=600&auto=format&fit=crop&q=80")!,
            rating: Product.Rating(rate: 4.8, count: 124)
        ),
        Product(
            id: 102,
            title: "Reloj Bauhaus Automático Cerámica Marfil",
            price: 195.0,
            description: "Esfera limpia sin números, bisel de acero quirúrgico mate y correa de gamuza taupe. Movimiento suizo automático.",
            category: "jewelery",
            image: URL(string: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600&auto=format&fit=crop&q=80")!,
            rating: Product.Rating(rate: 4.9, count: 89)
        ),
        Product(
            id: 103,
            title: "Chaqueta Kimono Lino Natural Crudo",
            price: 110.0,
            description: "Corte desestructurado en lino europeo puro teñido con tintes minerales. Botones de cuerno reciclado.",
            category: "men's clothing",
            image: URL(string: "https://images.unsplash.com/photo-1591047139829-d91aecb6caea?w=600&auto=format&fit=crop&q=80")!,
            rating: Product.Rating(rate: 4.7, count: 62)
        ),
        Product(
            id: 104,
            title: "Altavoz Escultural Concreto y Madera de Nogal",
            price: 145.0,
            description: "Cuerpo de microcemento acústico moldeado artesanalmente, transductor de alta fidelidad y rejilla de nogal oscuro.",
            category: "electronics",
            image: URL(string: "https://images.unsplash.com/photo-1545454675-3531b543be5d?w=600&auto=format&fit=crop&q=80")!,
            rating: Product.Rating(rate: 4.9, count: 215)
        ),
        Product(
            id: 105,
            title: "Suéter Cuello Redondo Lana Merino Alabastro",
            price: 76.0,
            description: "Punto fino de merino australiano extra suave. Calidez liviana con caída relajada y ribetes acanalados discretos.",
            category: "men's clothing",
            image: URL(string: "https://images.unsplash.com/photo-1620799140408-edc6dcb6d633?w=600&auto=format&fit=crop&q=80")!,
            rating: Product.Rating(rate: 4.6, count: 98)
        ),
        Product(
            id: 106,
            title: "Vela Aromática de Cera de Soya & Resina Oliban",
            price: 34.0,
            description: "En vasija de gres porcelánico hecha a mano. Notas secas de cedro, vetiver y resina de incienso silvestre.",
            category: "jewelery",
            image: URL(string: "https://images.unsplash.com/photo-1603006905003-be475563bc59?w=600&auto=format&fit=crop&q=80")!,
            rating: Product.Rating(rate: 4.9, count: 180)
        ),
        Product(
            id: 107,
            title: "Auriculares Sobre-Oreja Grafito Mate",
            price: 160.0,
            description: "Cancelación activa de ruido híbrida, transductores de berilio de 40mm y almohadillas viscoelásticas recubiertas de tela técnica.",
            category: "electronics",
            image: URL(string: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600&auto=format&fit=crop&q=80")!,
            rating: Product.Rating(rate: 4.8, count: 340)
        ),
        Product(
            id: 108,
            title: "Jarrón Minimalista Cerámica Ahumada",
            price: 52.0,
            description: "Silueta arquitectónica modelada a torno con textura arenada porosa. Ideal para flores secas o ramas minimalistas.",
            category: "jewelery",
            image: URL(string: "https://images.unsplash.com/photo-1578749556568-bc2c40e68b61?w=600&auto=format&fit=crop&q=80")!,
            rating: Product.Rating(rate: 4.7, count: 47)
        )
    ]

    /// Petición GET genérica que decodifica cualquier tipo Decodable.
    private func get<T: Decodable>(_ url: URL) async throws -> T {
        let (data, response) = try await session.data(from: url)
        if let http = response as? HTTPURLResponse, !(200...299).contains(http.statusCode) {
            throw APIError.badResponse(http.statusCode)
        }
        return try decoder.decode(T.self, from: data)
    }

    // 1) Catálogo — Colección curada + Fake Store API (con fallback seguro sin conexión)
    func fetchProducts() async throws -> [Product] {
        do {
            let remote: [Product] = try await get(URL(string: "https://fakestoreapi.com/products")!)
            return Self.curatedProducts + remote
        } catch {
            return Self.curatedProducts
        }
    }

    func fetchProduct(id: Int) async throws -> Product {
        if let local = Self.curatedProducts.first(where: { $0.id == id }) {
            return local
        }
        return try await get(URL(string: "https://fakestoreapi.com/products/\(id)")!)
    }

    func fetchCategories() async throws -> [String] {
        try await get(URL(string: "https://fakestoreapi.com/products/categories")!)
    }

    // 2) Tipo de cambio USD → MXN — ExchangeRate-API (gratis, sin llave)
    func fetchUSDtoMXN() async throws -> Double {
        let res: ExchangeRateResponse = try await get(URL(string: "https://open.er-api.com/v6/latest/USD")!)
        return res.rates["MXN"] ?? 18.25
    }

    // 3) Productos por código de barras — Open Food Facts (con respaldo seguro y sin force-unwrap)
    func lookupBarcode(_ code: String) async throws -> OpenFoodFactsResponse.OFFProduct {
        let clean = code.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !clean.isEmpty,
              let encoded = clean.addingPercentEncoding(withAllowedCharacters: .urlPathAllowed),
              let url = URL(string: "https://world.openfoodfacts.org/api/v2/product/\(encoded).json?fields=product_name,brands,image_url,categories") else {
            throw APIError.invalidCode
        }

        if let res: OpenFoodFactsResponse = try? await get(url), res.status == 1, let p = res.product {
            return p
        }

        // Respaldo para códigos de demostración conocidos (incluso sin red)
        if clean.contains("7501055300075") {
            return OpenFoodFactsResponse.OFFProduct(
                product_name: "Galletas Marías Tradicionales 170g",
                brands: "Gamesa",
                image_url: URL(string: "https://images.openfoodfacts.org/images/products/750/105/530/0075/front_es.3.400.jpg"),
                categories: "Snacks, Galletas"
            )
        }
        if clean.contains("3017620422003") {
            return OpenFoodFactsResponse.OFFProduct(
                product_name: "Nutella Crema de Avellana y Cacao",
                brands: "Ferrero",
                image_url: URL(string: "https://images.openfoodfacts.org/images/products/301/762/042/2003/front_fr.519.400.jpg"),
                categories: "Untables dulces"
            )
        }
        if clean.contains("7501000111208") {
            return OpenFoodFactsResponse.OFFProduct(
                product_name: "Bebida Refrescante Cola Sin Azúcar 600ml",
                brands: "Coca-Cola",
                image_url: URL(string: "https://images.openfoodfacts.org/images/products/750/100/011/1208/front_es.7.400.jpg"),
                categories: "Bebidas"
            )
        }

        throw APIError.notFound
    }
}
