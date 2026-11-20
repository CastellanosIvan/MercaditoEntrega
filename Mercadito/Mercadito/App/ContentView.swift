import SwiftUI

/// Crea el estado de la app y lo comparte con todas las pestañas.
struct ContentView: View {
    @State private var store = CartStore()
    @State private var motion = MotionManager()

    var body: some View {
        MainTabView()
            .environment(store)
            .environment(motion)
            .task {
                await store.loadExchangeRate()
                if store.products.isEmpty {
                    await store.loadProducts()
                }
            }
            .onAppear { motion.start() }
            .onOpenURL { url in
                Task {
                    await store.handleDeepLink(url)
                }
            }
            .sheet(item: $store.deepLinkedProduct) { product in
                NavigationStack {
                    ProductDetailView(product: product)
                        .toolbar {
                            ToolbarItem(placement: .topBarLeading) {
                                Button("Cerrar") { store.deepLinkedProduct = nil }
                            }
                        }
                }
                .environment(store)
                .environment(motion)
            }
    }
}

struct MainTabView: View {
    @Environment(CartStore.self) private var store

    var body: some View {
        TabView {
            CatalogView()
                .tabItem { Label("Tienda", systemImage: "bag") }
            ScannerView()
                .tabItem { Label("Escanear", systemImage: "qrcode.viewfinder") }
            CartView()
                .tabItem { Label("Carrito", systemImage: "cart") }
                .badge(store.itemCount)
            FilesView()
                .tabItem { Label("Archivos", systemImage: "folder") }
            OrdersView()
                .tabItem { Label("Pedidos", systemImage: "shippingbox") }
        }
        .tint(.primary)
    }
}

#Preview { ContentView() }
