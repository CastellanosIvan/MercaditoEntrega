import Foundation
import Observation

/// Estado global: catálogo, carrito, pedidos y enlaces profundos de QR.
/// Persiste carrito y pedidos en JSON en Documents.
@Observable
final class CartStore {
    var products: [Product] = []
    var items: [CartItem] = []
    var orders: [Order] = []
    var usdToMXN: Double = 18.25
    var isLoading = false
    var errorMessage: String?

    /// Producto abierto mediante enlace profundo `mercadito://product/...` o QR externo.
    var deepLinkedProduct: Product?

    /// Último artículo eliminado — se recupera agitando el iPhone (acelerómetro).
    private(set) var lastRemoved: CartItem?

    private let ordersURL = URL.documentsDirectory.appending(path: "orders.json")
    private let cartURL = URL.documentsDirectory.appending(path: "cart.json")

    init() {
        loadOrders()
        loadCart()
    }

    // MARK: Red
    func loadProducts() async {
        isLoading = true
        errorMessage = nil
        defer { isLoading = false }
        do {
            products = try await APIService.shared.fetchProducts()
        } catch {
            if products.isEmpty {
                products = APIService.curatedProducts
            }
            errorMessage = error.localizedDescription
        }
    }

    func loadExchangeRate() async {
        if let rate = try? await APIService.shared.fetchUSDtoMXN() { usdToMXN = rate }
    }

    /// Resuelve un producto de Mercadito desde un QR o código de barras (`750999XXXXXXC` / `mercadito://product/<id>`).
    func resolveMercaditoProduct(from rawCode: String) async -> Product? {
        guard let parsed = CodeGenerator.parseMercaditoCode(rawCode) else { return nil }

        // 1) Buscar en catálogo ya cargado (por ID o barcode)
        if let id = parsed.productID, let match = products.first(where: { $0.id == id }) {
            return match
        }
        if let code = parsed.barcode, let match = products.first(where: { $0.effectiveBarcode == code }) {
            return match
        }

        // 2) Buscar en catálogo curado o API remota
        if let id = parsed.productID, let remote = try? await APIService.shared.fetchProduct(id: id) {
            return remote
        }

        // 3) Construir producto con los metadatos del QR si fue compartido sin conexión
        if let id = parsed.productID, let title = parsed.title {
            return Product(
                id: id,
                title: title,
                price: parsed.priceUSD ?? (39.0 / usdToMXN),
                description: "Producto compartido vía código Mercadito (\(parsed.barcode ?? CodeGenerator.barcodeString(forProductID: id))).",
                category: parsed.category ?? "general",
                image: URL(string: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600&auto=format&fit=crop&q=80")!,
                rating: nil,
                barcode: parsed.barcode
            )
        }

        return nil
    }

    /// Maneja enlaces profundos `mercadito://product/...` desde Cámara / Safari / Mensajes.
    @MainActor
    func handleDeepLink(_ url: URL) async {
        guard url.scheme?.lowercased() == "mercadito",
              url.host?.lowercased() == "product" else { return }
        if products.isEmpty {
            await loadProducts()
        }
        if let product = await resolveMercaditoProduct(from: url.absoluteString) {
            deepLinkedProduct = product
        }
    }

    // MARK: Precios
    func mxn(_ usd: Double) -> Double { usd * usdToMXN }
    var subtotalMXN: Double { items.reduce(0) { $0 + mxn($1.product.price) * Double($1.quantity) } }
    var itemCount: Int { items.reduce(0) { $0 + $1.quantity } }

    // MARK: Carrito
    func add(_ product: Product, quantity: Int = 1) {
        let qty = max(1, quantity)
        if let i = items.firstIndex(where: { $0.product.id == product.id }) {
            items[i].quantity += qty
        } else {
            items.append(CartItem(product: product, quantity: qty))
        }
        saveCart()
    }

    func remove(_ item: CartItem) {
        lastRemoved = item
        items.removeAll { $0.id == item.id }
        saveCart()
    }

    func undoRemove() -> Bool {
        guard let item = lastRemoved else { return false }
        items.append(item)
        lastRemoved = nil
        saveCart()
        return true
    }

    func setQuantity(_ q: Int, for item: CartItem) {
        guard let i = items.firstIndex(of: item) else { return }
        if q <= 0 { remove(item) } else { items[i].quantity = q; saveCart() }
    }

    // MARK: Pedidos
    func placeOrder(method: PaymentMethod, shipping: Double, address: String) -> Order {
        var order = Order(id: UUID(), date: .now, items: items, subtotalMXN: subtotalMXN,
                          shippingMXN: shipping, method: method, address: address)
        order.receiptFileName = try? ReceiptPDF.generate(for: order).lastPathComponent
        orders.insert(order, at: 0)
        items.removeAll()
        lastRemoved = nil
        saveCart()
        saveOrders()
        return order
    }

    func importOrders(from data: Data) throws -> Int {
        let imported = try JSONDecoder().decode([Order].self, from: data)
        let existingIDs = Set(orders.map(\.id))
        let newOrders = imported.filter { !existingIDs.contains($0.id) }
        orders = (newOrders + orders).sorted { $0.date > $1.date }
        saveOrders()
        return newOrders.count
    }

    private func saveCart() {
        try? JSONEncoder().encode(items).write(to: cartURL)
    }

    private func loadCart() {
        guard let data = try? Data(contentsOf: cartURL) else { return }
        items = (try? JSONDecoder().decode([CartItem].self, from: data)) ?? []
    }

    private func saveOrders() {
        let encoder = JSONEncoder()
        encoder.outputFormatting = .prettyPrinted
        try? encoder.encode(orders).write(to: ordersURL)
    }

    private func loadOrders() {
        guard let data = try? Data(contentsOf: ordersURL) else { return }
        orders = (try? JSONDecoder().decode([Order].self, from: data)) ?? []
    }
}

extension Double {
    var mxnText: String { formatted(.currency(code: "MXN")) }
}
