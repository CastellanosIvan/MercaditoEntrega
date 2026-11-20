import SwiftUI
import PhotosUI
import QuickLook
import UniformTypeIdentifiers

/// Centro de archivos: subir fotos/documentos, descargar archivos, importar, exportar y previsualizar.
struct FilesView: View {
    @Environment(CartStore.self) private var store
    @State private var files = FileTransferService()
    @State private var photo: PhotosPickerItem?
    @State private var showImporter = false
    @State private var showOrdersImporter = false
    @State private var preview: URL?

    // Archivos de ejemplo para descargar (distintos tipos)
    struct Sample: Identifiable {
        let title: String
        let name: String
        let url: URL
        var id: String { name }
    }

    private let samples: [Sample] = [
        Sample(title: "Catálogo PDF", name: "catalogo.pdf", url: URL(string: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf")!),
        Sample(title: "Banner JPG", name: "banner.jpg", url: URL(string: "https://picsum.photos/1200/600.jpg")!),
        Sample(title: "Productos JSON", name: "productos.json", url: URL(string: "https://fakestoreapi.com/products")!)
    ]

    var body: some View {
        NavigationStack {
            List {
                Section("Subir y respaldar") {
                    PhotosPicker(selection: $photo, matching: .images) {
                        Label("Foto de comprobante / devolución (JPG)", systemImage: "photo")
                    }
                    Button("Subir mis pedidos (JSON)", systemImage: "curlybraces") {
                        Task {
                            let data = (try? JSONEncoder().encode(store.orders)) ?? Data("[]".utf8)
                            await files.upload(data: data, fileName: "pedidos.json", mimeType: "application/json", saveLocalCopy: true)
                        }
                    }
                    Button("Importar archivo desde Archivos…", systemImage: "folder.badge.plus") { showImporter = true }
                    Button("Importar historial de pedidos (JSON)…", systemImage: "square.and.arrow.down") { showOrdersImporter = true }
                }

                Section("Descargar") {
                    ForEach(samples) { sample in
                        Button(sample.title, systemImage: "arrow.down.circle") {
                            Task { await files.download(from: sample.url, as: sample.name) }
                        }
                    }
                    if files.progress > 0 && files.progress < 1 {
                        ProgressView(value: files.progress)
                    }
                }

                if !files.status.isEmpty {
                    Section("Estado") { Text(files.status).font(.callout) }
                }

                Section("En el dispositivo") {
                    ForEach(files.localFiles, id: \.self) { url in
                        HStack {
                            Image(systemName: icon(for: url))
                            Text(url.lastPathComponent).lineLimit(1)
                            Spacer()
                            ShareLink(item: url) { Image(systemName: "square.and.arrow.up") }
                                .buttonStyle(.borderless)
                            Button { Task {
                                if let data = try? Data(contentsOf: url) {
                                    await files.upload(data: data, fileName: url.lastPathComponent,
                                                       mimeType: FileTransferService.mimeType(for: url))
                                }
                            } } label: { Image(systemName: "icloud.and.arrow.up") }
                                .buttonStyle(.borderless)
                        }
                        .contentShape(.rect)
                        .onTapGesture { preview = url }
                    }
                    .onDelete { $0.map { files.localFiles[$0] }.forEach(files.delete) }
                }
            }
            .navigationTitle("Archivos")
            .onAppear { files.refreshFiles() }
            .quickLookPreview($preview)
            .fileImporter(isPresented: $showImporter,
                          allowedContentTypes: [.pdf, .image, .json, .plainText, .commaSeparatedText]) { result in
                if case .success(let url) = result { _ = files.importFile(url) }
            }
            .fileImporter(isPresented: $showOrdersImporter,
                          allowedContentTypes: [.json]) { result in
                if case .success(let url) = result, let data = files.importFile(url) {
                    do {
                        let count = try store.importOrders(from: data)
                        files.status = "✅ Se importaron \(count) pedido(s) nuevos"
                    } catch {
                        files.status = "❌ JSON de pedidos no válido"
                    }
                }
            }
            .onChange(of: photo) {
                Task {
                    guard let item = photo,
                          let data = try? await item.loadTransferable(type: Data.self),
                          let jpg = UIImage(data: data)?.jpegData(compressionQuality: 0.7) else { return }
                    let fileName = "foto-\(Int(Date.now.timeIntervalSince1970)).jpg"
                    await files.upload(data: jpg, fileName: fileName, mimeType: "image/jpeg", saveLocalCopy: true)
                    photo = nil
                }
            }
        }
    }

    private func icon(for url: URL) -> String {
        switch url.pathExtension.lowercased() {
        case "pdf": "doc.richtext"
        case "jpg", "jpeg", "png": "photo"
        case "json": "curlybraces"
        default: "doc"
        }
    }
}

struct OrdersView: View {
    @Environment(CartStore.self) private var store
    @State private var preview: URL?

    var body: some View {
        NavigationStack {
            Group {
                if store.orders.isEmpty {
                    ContentUnavailableView("Sin pedidos", systemImage: "shippingbox",
                                           description: Text("Tus compras completadas y sus recibos PDF aparecerán aquí."))
                } else {
                    List(store.orders) { order in
                        VStack(alignment: .leading, spacing: 6) {
                            HStack {
                                Text(order.date.formatted(date: .abbreviated, time: .shortened)).bold()
                                Spacer()
                                Text(order.totalMXN.mxnText).bold().foregroundStyle(.primary)
                            }
                            Text("\(order.items.reduce(0) { $0 + $1.quantity }) artículo(s) · \(order.method.rawValue)")
                                .font(.caption).foregroundStyle(.secondary)
                            if !order.address.isEmpty {
                                Label(order.address, systemImage: "mappin.and.ellipse")
                                    .font(.caption2)
                                    .foregroundStyle(.secondary)
                                    .lineLimit(1)
                            }
                            if let name = order.receiptFileName {
                                let receiptURL = URL.documentsDirectory.appending(path: name)
                                HStack(spacing: 16) {
                                    Button("Ver recibo PDF", systemImage: "doc.richtext") {
                                        preview = receiptURL
                                    }
                                    .font(.caption).buttonStyle(.borderless)

                                    ShareLink(item: receiptURL) {
                                        Label("Compartir", systemImage: "square.and.arrow.up")
                                            .font(.caption)
                                    }
                                    .buttonStyle(.borderless)
                                }
                                .padding(.top, 2)
                            }
                        }
                        .padding(.vertical, 2)
                    }
                }
            }
            .navigationTitle("Pedidos")
            .quickLookPreview($preview)
        }
    }
}
