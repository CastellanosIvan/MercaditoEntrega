import SwiftUI
import VisionKit
import PhotosUI
import AVFoundation

/// SENSOR 5: Cámara — escaneo de códigos QR y códigos de barras con VisionKit + Vision (Fotos).
/// Reconoce tanto códigos propios de Mercadito (QR `mercadito://product/...` y barras `750999...`)
/// como códigos comerciales en Open Food Facts.
struct ScannerView: View {
    @Environment(CartStore.self) private var store
    @State private var scanned: String?
    @State private var foundMercaditoProduct: Product?
    @State private var foundOFFProduct: OpenFoodFactsResponse.OFFProduct?
    @State private var activeCode: String = ""
    @State private var error: String?
    @State private var isSearching = false
    @State private var manualCode = ""
    @State private var torchOn = false
    @State private var pickedPhoto: PhotosPickerItem?
    @State private var addedToast = false
    @State private var detailProduct: Product?

    private let hasCameraPermissionKey = Bundle.main.object(forInfoDictionaryKey: "NSCameraUsageDescription") != nil

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 16) {
                    if !hasCameraPermissionKey {
                        ContentUnavailableView("Falta permiso de cámara",
                            systemImage: "camera.badge.ellipsis",
                            description: Text("Agrega \"Privacy - Camera Usage Description\" en la pestaña Info del target."))
                            .frame(height: 220)
                    } else if DataScannerViewController.isSupported && DataScannerViewController.isAvailable {
                        ZStack(alignment: .bottomTrailing) {
                            BarcodeScanner(onCode: { code in
                                guard code != scanned else { return }
                                scanned = code
                                manualCode = code
                                Task { await lookup(code) }
                            })
                            .frame(height: 280)
                            .clipShape(.rect(cornerRadius: 20))

                            Button {
                                toggleTorch()
                            } label: {
                                Image(systemName: torchOn ? "flashlight.on.fill" : "flashlight.off.fill")
                                    .padding(10)
                                    .background(.ultraThinMaterial, in: .circle)
                            }
                            .padding(12)
                        }
                    } else {
                        ContentUnavailableView("Cámara no disponible",
                            systemImage: "camera.fill",
                            description: Text("Usa un iPhone real, importa una foto con QR/código o escribe el código abajo."))
                            .frame(height: 200)
                    }

                    HStack(spacing: 8) {
                        TextField("Código de barras o enlace QR", text: $manualCode)
                            .textInputAutocapitalization(.never)
                            .autocorrectionDisabled()
                            .textFieldStyle(.roundedBorder)
                        Button("Buscar") {
                            scanned = manualCode
                            Task { await lookup(manualCode) }
                        }
                        .buttonStyle(.borderedProminent)
                        .tint(.primary)
                        .disabled(manualCode.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty || isSearching)
                    }

                    HStack {
                        PhotosPicker(selection: $pickedPhoto, matching: .images) {
                            Label("Escanear desde Foto", systemImage: "photo.badge.plus")
                                .font(.caption.weight(.medium))
                        }
                        .buttonStyle(.bordered)

                        Spacer()

                        if scanned != nil || foundMercaditoProduct != nil || foundOFFProduct != nil {
                            Button("Escanear otro", systemImage: "arrow.counterclockwise") {
                                resetScanner()
                            }
                            .font(.caption.weight(.medium))
                            .buttonStyle(.bordered)
                        }
                    }

                    // Códigos de prueba rápida
                    ScrollView(.horizontal, showsIndicators: false) {
                        HStack(spacing: 8) {
                            sampleChip("7509990001015", label: "Producto QR/EAN #101")
                            sampleChip("7501055300075", label: "Galletas Marías")
                            sampleChip("3017620422003", label: "Nutella")
                            sampleChip("7501000111208", label: "Coca-Cola")
                        }
                    }

                    if isSearching {
                        ProgressView("Consultando código…")
                            .padding(.top, 8)
                    }

                    // Resultado 1: Producto propio de Mercadito (QR o código de barras generado por la app)
                    if let mp = foundMercaditoProduct {
                        VStack(alignment: .leading, spacing: 12) {
                            HStack(spacing: 12) {
                                AsyncImage(url: mp.image) { $0.resizable().scaledToFit() } placeholder: { Color.gray.opacity(0.1) }
                                    .frame(width: 72, height: 72)
                                    .background(Color(uiColor: .systemBackground), in: .rect(cornerRadius: 10))
                                VStack(alignment: .leading, spacing: 3) {
                                    Text("PRODUCTO MERCADITO")
                                        .font(.caption2.weight(.bold))
                                        .foregroundStyle(.secondary)
                                    Text(mp.title).bold().foregroundStyle(.primary).lineLimit(2)
                                    Text("EAN: \(mp.effectiveBarcode)")
                                        .font(.caption2.monospaced())
                                        .foregroundStyle(.secondary)
                                    Text(store.mxn(mp.price).mxnText)
                                        .font(.subheadline.bold())
                                        .foregroundStyle(.primary)
                                }
                                Spacer()
                            }

                            HStack(spacing: 10) {
                                Button("Ver detalle y QR") {
                                    detailProduct = mp
                                }
                                .buttonStyle(.bordered)
                                .frame(maxWidth: .infinity)

                                Button("Agregar al carrito") {
                                    store.add(mp)
                                    showAddedFeedback()
                                    resetScanner()
                                }
                                .buttonStyle(.borderedProminent)
                                .tint(.primary)
                                .frame(maxWidth: .infinity)
                            }
                        }
                        .padding()
                        .background(Color(uiColor: .secondarySystemGroupedBackground), in: .rect(cornerRadius: 16))
                        .overlay(
                            RoundedRectangle(cornerRadius: 16)
                                .stroke(Color.primary.opacity(0.08), lineWidth: 1)
                        )
                    }

                    // Resultado 2: Producto de Open Food Facts
                    if let p = foundOFFProduct {
                        HStack(spacing: 12) {
                            AsyncImage(url: p.image_url) { $0.resizable().scaledToFit() } placeholder: { Color.gray.opacity(0.1) }
                                .frame(width: 70, height: 70)
                                .background(Color(uiColor: .systemBackground), in: .rect(cornerRadius: 8))
                            VStack(alignment: .leading, spacing: 2) {
                                Text(p.product_name ?? "Producto").bold().foregroundStyle(.primary)
                                Text(p.brands ?? "").font(.caption).foregroundStyle(.secondary)
                                Text(Double(39).mxnText).font(.subheadline.bold()).foregroundStyle(.primary)
                            }
                            Spacer()
                            Button("Agregar") { addScannedOFF(p) }
                                .buttonStyle(.borderedProminent)
                                .tint(.primary)
                        }
                        .padding()
                        .background(Color(uiColor: .secondarySystemGroupedBackground), in: .rect(cornerRadius: 16))
                        .overlay(
                            RoundedRectangle(cornerRadius: 16)
                                .stroke(Color.primary.opacity(0.08), lineWidth: 1)
                        )
                    }

                    if let error {
                        Text(error)
                            .font(.callout)
                            .foregroundStyle(.red)
                    }

                    if addedToast {
                        Label("Agregado al carrito", systemImage: "checkmark.circle.fill")
                            .font(.subheadline.weight(.medium))
                            .padding(.horizontal, 16)
                            .padding(.vertical, 10)
                            .background(.thinMaterial, in: .capsule)
                    }
                }
                .padding()
            }
            .navigationTitle("Escanear")
            .onDisappear { setTorch(false) }
            .onChange(of: pickedPhoto) {
                Task {
                    guard let item = pickedPhoto,
                          let data = try? await item.loadTransferable(type: Data.self),
                          let image = UIImage(data: data) else { return }
                    let codes = await CodeGenerator.detectCodes(in: image)
                    if let first = codes.first {
                        scanned = first
                        manualCode = first
                        await lookup(first)
                    } else {
                        error = "No se detectó ningún QR ni código de barras en la imagen."
                    }
                    pickedPhoto = nil
                }
            }
            .sheet(item: $detailProduct) { product in
                NavigationStack {
                    ProductDetailView(product: product)
                        .toolbar {
                            ToolbarItem(placement: .topBarLeading) {
                                Button("Cerrar") { detailProduct = nil }
                            }
                        }
                }
            }
        }
    }

    private func sampleChip(_ code: String, label: String) -> some View {
        Button {
            manualCode = code
            scanned = code
            Task { await lookup(code) }
        } label: {
            Text(label)
                .font(.caption)
                .padding(.horizontal, 10)
                .padding(.vertical, 6)
                .background(Color(uiColor: .secondarySystemGroupedBackground), in: .capsule)
        }
        .buttonStyle(.plain)
    }

    private func lookup(_ rawCode: String) async {
        let code = rawCode.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !code.isEmpty else { return }

        error = nil
        foundMercaditoProduct = nil
        foundOFFProduct = nil
        activeCode = code
        isSearching = true
        defer { isSearching = false }

        // 1) Verificar si es QR o código de barras propio de Mercadito
        if let mercaditoProduct = await store.resolveMercaditoProduct(from: code) {
            foundMercaditoProduct = mercaditoProduct
            return
        }

        // 2) Buscar en Open Food Facts
        do {
            foundOFFProduct = try await APIService.shared.lookupBarcode(code)
        } catch {
            self.error = error.localizedDescription
        }
    }

    /// Convierte el producto escaneado en un Product del catálogo con su código de barras real.
    private func addScannedOFF(_ p: OpenFoodFactsResponse.OFFProduct) {
        let code = activeCode.isEmpty ? manualCode : activeCode
        let product = Product(
            id: abs(code.hashValue % 1_000_000) + 1000,
            title: p.product_name ?? "Producto escaneado",
            price: 39 / store.usdToMXN,
            description: "\(p.brands ?? "Abarrotes") · Código: \(code)",
            category: "abarrotes",
            image: p.image_url ?? URL(string: "https://images.unsplash.com/photo-1542838132-92c53300491e?w=500&auto=format&fit=crop&q=80")!,
            rating: nil,
            barcode: code
        )
        store.add(product)
        showAddedFeedback()
        resetScanner()
    }

    private func resetScanner() {
        scanned = nil
        foundMercaditoProduct = nil
        foundOFFProduct = nil
        error = nil
        manualCode = ""
    }

    private func showAddedFeedback() {
        withAnimation { addedToast = true }
        Task {
            try? await Task.sleep(for: .seconds(2))
            withAnimation { addedToast = false }
        }
    }

    private func toggleTorch() {
        setTorch(!torchOn)
    }

    private func setTorch(_ enabled: Bool) {
        guard let device = AVCaptureDevice.default(for: .video), device.hasTorch else {
            torchOn = false
            return
        }
        try? device.lockForConfiguration()
        if enabled {
            try? device.setTorchModeOn(level: 0.7)
            torchOn = true
        } else {
            device.torchMode = .off
            torchOn = false
        }
        device.unlockForConfiguration()
    }
}

struct BarcodeScanner: UIViewControllerRepresentable {
    var onCode: (String) -> Void

    func makeUIViewController(context: Context) -> DataScannerViewController {
        let vc = DataScannerViewController(
            recognizedDataTypes: [
                .barcode(symbologies: [.qr, .code128, .ean13, .ean8, .upce, .code39])
            ],
            qualityLevel: .balanced,
            recognizesMultipleItems: false,
            isHighFrameRateTrackingEnabled: false,
            isPinchToZoomEnabled: true,
            isGuidanceEnabled: true,
            isHighlightingEnabled: true
        )
        vc.delegate = context.coordinator
        return vc
    }

    func updateUIViewController(_ vc: DataScannerViewController, context: Context) {
        // Se inicia cuando la vista ya está en pantalla (iniciarlo antes falla en silencio)
        if !vc.isScanning { try? vc.startScanning() }
    }

    func makeCoordinator() -> Coordinator { Coordinator(onCode: onCode) }

    final class Coordinator: NSObject, DataScannerViewControllerDelegate {
        let onCode: (String) -> Void
        init(onCode: @escaping (String) -> Void) { self.onCode = onCode }

        func dataScanner(_ s: DataScannerViewController, didAdd items: [RecognizedItem], allItems: [RecognizedItem]) {
            for case .barcode(let b) in items {
                if let v = b.payloadStringValue {
                    onCode(v)
                    break
                }
            }
        }
    }
}
