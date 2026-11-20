import Foundation

// MARK: - Producto (JSON de https://fakestoreapi.com/products + catálogo curado + escaneados)
struct Product: Codable, Identifiable, Hashable {
    let id: Int
    let title: String
    let price: Double          // en USD
    let description: String
    let category: String
    let image: URL
    let rating: Rating?
    var barcode: String?

    init(
        id: Int,
        title: String,
        price: Double,
        description: String,
        category: String,
        image: URL,
        rating: Rating? = nil,
        barcode: String? = nil
    ) {
        self.id = id
        self.title = title
        self.price = price
        self.description = description
        self.category = category
        self.image = image
        self.rating = rating
        self.barcode = barcode
    }

    /// Código de barras EAN-13 determinístico (o el EAN original si fue escaneado de Open Food Facts).
    var effectiveBarcode: String {
        if let barcode, !barcode.isEmpty {
            return barcode
        }
        return CodeGenerator.barcodeString(forProductID: id)
    }

    /// URL profunda para QR compatible con Mercadito iOS y Web.
    var qrDeepLinkURL: URL {
        CodeGenerator.qrURL(for: self)
    }

    struct Rating: Codable, Hashable {
        let rate: Double
        let count: Int
    }
}

// MARK: - Producto escaneado (JSON de Open Food Facts)
struct OpenFoodFactsResponse: Codable {
    let status: Int
    let product: OFFProduct?

    struct OFFProduct: Codable {
        let product_name: String?
        let brands: String?
        let image_url: URL?
        let categories: String?
    }
}

// MARK: - Tipo de cambio (JSON de https://open.er-api.com/v6/latest/USD)
struct ExchangeRateResponse: Codable {
    let result: String
    let rates: [String: Double]
}

// MARK: - Carrito y pedidos
struct CartItem: Identifiable, Codable, Hashable {
    var id: Int { product.id }
    let product: Product
    var quantity: Int
}

enum PaymentMethod: String, Codable, CaseIterable {
    case applePay = "Apple Pay"
    case payPal = "PayPal"
    case card = "Tarjeta"
}

struct Order: Identifiable, Codable, Hashable {
    let id: UUID
    let date: Date
    let items: [CartItem]
    let subtotalMXN: Double
    let shippingMXN: Double
    let method: PaymentMethod
    let address: String
    var receiptFileName: String?

    var totalMXN: Double { subtotalMXN + shippingMXN }
}
