import SwiftUI

enum CatalogSortOption: String, CaseIterable {
    case featured = "Destacados"
    case priceAsc = "Menor precio"
    case priceDesc = "Mayor precio"
    case rating = "Mejor valorados"
}

struct CatalogView: View {
    @Environment(CartStore.self) private var store
    @State private var search = ""
    @State private var category = "Todas"
    @State private var sort: CatalogSortOption = .featured

    private var categories: [String] { ["Todas"] + Set(store.products.map(\.category)).sorted() }

    private var filtered: [Product] {
        var list = store.products.filter {
            (category == "Todas" || $0.category == category) &&
            (search.isEmpty ||
             $0.title.localizedCaseInsensitiveContains(search) ||
             $0.effectiveBarcode.localizedCaseInsensitiveContains(search))
        }
        switch sort {
        case .featured: break
        case .priceAsc: list.sort { $0.price < $1.price }
        case .priceDesc: list.sort { $0.price > $1.price }
        case .rating: list.sort { ($0.rating?.rate ?? 0) > ($1.rating?.rate ?? 0) }
        }
        return list
    }

    var body: some View {
        NavigationStack {
            Group {
                if store.isLoading && store.products.isEmpty {
                    ProgressView("Cargando catálogo…")
                } else if let err = store.errorMessage, store.products.isEmpty {
                    ContentUnavailableView("Sin conexión", systemImage: "wifi.slash", description: Text(err))
                } else {
                    ScrollView {
                        HStack {
                            Picker("Categoría", selection: $category) {
                                ForEach(categories, id: \.self) { Text(localizedCategory($0)) }
                            }
                            .pickerStyle(.menu)

                            Spacer()

                            Picker("Ordenar", selection: $sort) {
                                ForEach(CatalogSortOption.allCases, id: \.self) { Text($0.rawValue) }
                            }
                            .pickerStyle(.menu)
                        }
                        .padding(.horizontal)

                        LazyVGrid(columns: [GridItem(.adaptive(minimum: 160), spacing: 12)], spacing: 12) {
                            ForEach(filtered) { product in
                                NavigationLink(value: product) { ProductCard(product: product) }
                                    .buttonStyle(.plain)
                            }
                        }
                        .padding()
                    }
                    .refreshable { await store.loadProducts() }
                }
            }
            .navigationTitle("Mercadito")
            .searchable(text: $search, prompt: "Buscar por nombre o código")
            .navigationDestination(for: Product.self) { ProductDetailView(product: $0) }
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Text("1 USD = \(store.usdToMXN, specifier: "%.2f") MXN")
                        .font(.caption).foregroundStyle(.secondary)
                }
            }
            .task { if store.products.isEmpty { await store.loadProducts() } }
        }
    }

    private func localizedCategory(_ raw: String) -> String {
        switch raw {
        case "Todas": "Todas"
        case "men's clothing": "Hombre"
        case "women's clothing": "Mujer"
        case "jewelery": "Joyería & Hogar"
        case "electronics": "Tecnología"
        case "abarrotes": "Abarrotes"
        default: raw.capitalized
        }
    }
}

struct ProductCard: View {
    @Environment(CartStore.self) private var store
    let product: Product
    @State private var quickAdded = false

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            AsyncImage(url: product.image) { img in
                img.resizable().scaledToFit()
            } placeholder: { ProgressView() }
            .frame(height: 130)
            .frame(maxWidth: .infinity)
            .padding(8)
            .background(Color(uiColor: .systemBackground), in: .rect(cornerRadius: 12))

            Text(product.title)
                .font(.subheadline.weight(.medium))
                .lineLimit(2)
                .foregroundStyle(.primary)

            HStack {
                Text(store.mxn(product.price).mxnText)
                    .font(.subheadline.bold())
                    .foregroundStyle(.primary)
                Spacer()
                Button {
                    store.add(product)
                    quickAdded = true
                    Task {
                        try? await Task.sleep(for: .seconds(1))
                        quickAdded = false
                    }
                } label: {
                    Image(systemName: quickAdded ? "checkmark" : "plus")
                        .font(.caption.weight(.semibold))
                        .padding(6)
                        .background(Color.primary.opacity(0.08), in: .circle)
                        .foregroundStyle(.primary)
                }
                .sensoryFeedback(.impact(weight: .light), trigger: quickAdded)
            }
        }
        .padding(12)
        .background(Color(uiColor: .secondarySystemGroupedBackground), in: .rect(cornerRadius: 16))
        .overlay(
            RoundedRectangle(cornerRadius: 16)
                .stroke(Color.primary.opacity(0.06), lineWidth: 1)
        )
    }
}

struct ProductDetailView: View {
    @Environment(CartStore.self) private var store
    @Environment(MotionManager.self) private var motion
    let product: Product

    @State private var quantity = 1
    @State private var added = false
    @State private var dragTilt: CGSize = .zero
    @State private var qrImage: UIImage?
    @State private var barcodeImage: UIImage?
    @State private var shareCardImage: UIImage?
    @State private var copiedLink = false

    private var tiltX: Double {
        (motion.roll * 0.4) + Double(dragTilt.width / 160)
    }
    private var tiltY: Double {
        (-(motion.pitch - 0.6) * 0.3) - Double(dragTilt.height / 160)
    }

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 16) {
                // Efecto 3D con el GIROSCOPIO (y gesto táctil en simulador)
                AsyncImage(url: product.image) { img in
                    img.resizable().scaledToFit()
                } placeholder: { ProgressView() }
                .frame(height: 260)
                .frame(maxWidth: .infinity)
                .padding()
                .background(Color(uiColor: .systemBackground), in: .rect(cornerRadius: 24))
                .shadow(color: .black.opacity(0.12), radius: 14,
                        x: CGFloat(tiltX * 24), y: CGFloat(tiltY * 24))
                .rotation3DEffect(.radians(tiltX), axis: (x: 0, y: 1, z: 0))
                .rotation3DEffect(.radians(tiltY), axis: (x: 1, y: 0, z: 0))
                .animation(.easeOut(duration: 0.12), value: tiltX)
                .gesture(
                    DragGesture(minimumDistance: 0)
                        .onChanged { value in dragTilt = value.translation }
                        .onEnded { _ in withAnimation(.spring()) { dragTilt = .zero } }
                )

                Text("Inclina tu iPhone o arrastra la tarjeta para ver el producto en 3D")
                    .font(.caption).foregroundStyle(.secondary)

                Text(product.title).font(.title2.bold())
                if let r = product.rating {
                    Label("\(r.rate, specifier: "%.1f") (\(r.count) reseñas)", systemImage: "star.fill")
                        .foregroundStyle(.secondary)
                }

                HStack(alignment: .firstTextBaseline) {
                    Text(store.mxn(product.price).mxnText).font(.title.bold()).foregroundStyle(.primary)
                    Spacer()
                    Text("US$\(product.price, specifier: "%.2f")")
                        .font(.caption).foregroundStyle(.secondary)
                }

                Text(product.description).foregroundStyle(.secondary).font(.callout)

                Stepper("Cantidad: \(quantity)", value: $quantity, in: 1...20)
                    .padding(.vertical, 4)

                // MARK: Código QR y Código de Barras propios del producto
                VStack(alignment: .leading, spacing: 12) {
                    HStack {
                        Label("QR y Código de Barras", systemImage: "qrcode")
                            .font(.headline)
                        Spacer()
                        Text("EAN: \(product.effectiveBarcode)")
                            .font(.caption.monospaced())
                            .foregroundStyle(.secondary)
                    }

                    Text("Escanea cualquiera de estos códigos desde la pestaña Escanear o con la cámara de otro iPhone para abrir o agregar este producto.")
                        .font(.caption)
                        .foregroundStyle(.secondary)

                    HStack(spacing: 14) {
                        if let qrImage {
                            VStack(spacing: 6) {
                                Image(uiImage: qrImage)
                                    .interpolation(.none)
                                    .resizable()
                                    .scaledToFit()
                                    .frame(width: 112, height: 112)
                                    .clipShape(.rect(cornerRadius: 10))
                                    .overlay(RoundedRectangle(cornerRadius: 10).stroke(Color.primary.opacity(0.12)))
                                Text("Código QR")
                                    .font(.caption2).foregroundStyle(.secondary)
                            }
                        }

                        if let barcodeImage {
                            VStack(spacing: 6) {
                                Image(uiImage: barcodeImage)
                                    .interpolation(.none)
                                    .resizable()
                                    .scaledToFit()
                                    .frame(maxWidth: .infinity)
                                    .frame(height: 82)
                                    .clipShape(.rect(cornerRadius: 10))
                                    .overlay(RoundedRectangle(cornerRadius: 10).stroke(Color.primary.opacity(0.12)))
                                Text(product.effectiveBarcode)
                                    .font(.caption2.monospaced())
                                    .foregroundStyle(.secondary)
                            }
                        }
                    }

                    // Acciones para compartir (Tarjeta con QR/Barras + Enlace directo)
                    HStack(spacing: 10) {
                        if let shareCardImage {
                            ShareLink(
                                item: Image(uiImage: shareCardImage),
                                preview: SharePreview("\(product.title) — QR Mercadito", image: Image(uiImage: shareCardImage))
                            ) {
                                Label("Compartir tarjeta QR", systemImage: "qrcode.viewfinder")
                                    .font(.caption.weight(.semibold))
                                    .frame(maxWidth: .infinity)
                            }
                            .buttonStyle(.bordered)
                        }

                        ShareLink(
                            item: product.qrDeepLinkURL,
                            subject: Text(product.title),
                            message: Text("Mira \(product.title) (\(store.mxn(product.price).mxnText)) en Mercadito")
                        ) {
                            Label("Compartir enlace", systemImage: "square.and.arrow.up")
                                .font(.caption.weight(.semibold))
                                .frame(maxWidth: .infinity)
                        }
                        .buttonStyle(.bordered)
                    }

                    Button {
                        UIPasteboard.general.string = product.qrDeepLinkURL.absoluteString
                        copiedLink = true
                        Task {
                            try? await Task.sleep(for: .seconds(2))
                            copiedLink = false
                        }
                    } label: {
                        Label(copiedLink ? "Enlace copiado" : "Copiar enlace mercadito://",
                              systemImage: copiedLink ? "checkmark" : "doc.on.doc")
                            .font(.caption)
                    }
                    .buttonStyle(.plain)
                    .foregroundStyle(.secondary)
                }
                .padding()
                .background(Color(uiColor: .secondarySystemGroupedBackground), in: .rect(cornerRadius: 18))
                .overlay(
                    RoundedRectangle(cornerRadius: 18)
                        .stroke(Color.primary.opacity(0.08), lineWidth: 1)
                )
            }
            .padding()
        }
        .safeAreaInset(edge: .bottom) {
            Button {
                store.add(product, quantity: quantity)
                added = true
                Task {
                    try? await Task.sleep(for: .seconds(2))
                    added = false
                }
            } label: {
                Label(added ? "¡Agregado al carrito!" : "Agregar \(quantity > 1 ? "\(quantity) " : "")al carrito",
                      systemImage: added ? "checkmark" : "cart.badge.plus")
                    .frame(maxWidth: .infinity)
            }
            .buttonStyle(.borderedProminent)
            .tint(.primary)
            .controlSize(.large)
            .padding()
            .background(.ultraThinMaterial)
            .sensoryFeedback(.success, trigger: added)
        }
        .task(id: product.id) {
            generateProductCodes()
        }
    }

    @MainActor
    private func generateProductCodes() {
        let qrPayload = product.qrDeepLinkURL.absoluteString
        let barcodePayload = product.effectiveBarcode
        let qr = CodeGenerator.generateQRImage(from: qrPayload, size: 220)
        let bar = CodeGenerator.generateBarcodeImage(from: barcodePayload, width: 320, height: 96)
        qrImage = qr
        barcodeImage = bar
        shareCardImage = renderShareCard(qr: qr, barcode: bar)
    }

    @MainActor
    private func renderShareCard(qr: UIImage?, barcode: UIImage?) -> UIImage? {
        let cardView = VStack(spacing: 14) {
            Text("MERCADITO")
                .font(.caption.weight(.bold))
                .tracking(3)
                .foregroundStyle(.secondary)
            Text(product.title)
                .font(.headline)
                .multilineTextAlignment(.center)
                .foregroundStyle(.black)
                .lineLimit(2)
            Text(store.mxn(product.price).mxnText)
                .font(.title2.bold())
                .foregroundStyle(.black)

            if let qr {
                Image(uiImage: qr)
                    .interpolation(.none)
                    .resizable()
                    .scaledToFit()
                    .frame(width: 180, height: 180)
            }

            if let barcode {
                Image(uiImage: barcode)
                    .interpolation(.none)
                    .resizable()
                    .scaledToFit()
                    .frame(width: 240, height: 74)
            }

            Text("EAN: \(product.effectiveBarcode)")
                .font(.caption.monospaced())
                .foregroundStyle(.gray)
            Text("Escanea este código en Mercadito iPhone")
                .font(.caption2)
                .foregroundStyle(.gray)
        }
        .padding(24)
        .frame(width: 340)
        .background(Color.white)
        .clipShape(.rect(cornerRadius: 20))

        let renderer = ImageRenderer(content: cardView)
        renderer.scale = 3.0
        return renderer.uiImage
    }
}
