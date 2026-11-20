import Foundation
import UIKit
import Observation

/// Transferencia de archivos de distintos tipos:
///  • SUBIDA multipart/form-data (imágenes JPG/PNG, PDF, JSON, TXT) → https://httpbin.org/post (eco de prueba)
///  • DESCARGA con barra de progreso (PDF, imagen, JSON) → Documents
///  • Exportar / importar (ShareLink y fileImporter en la vista)
@Observable
final class FileTransferService: NSObject, URLSessionDownloadDelegate {
    var progress: Double = 0
    var status: String = ""
    var localFiles: [URL] = []

    private var downloadContinuation: CheckedContinuation<URL, Error>?
    private var downloadName = ""

    override init() {
        super.init()
        refreshFiles()
    }

    func refreshFiles() {
        localFiles = (try? FileManager.default.contentsOfDirectory(
            at: .documentsDirectory, includingPropertiesForKeys: [.fileSizeKey]))?
            .sorted { $0.lastPathComponent < $1.lastPathComponent } ?? []
    }

    // MARK: Subida multipart
    func upload(data: Data, fileName: String, mimeType: String, saveLocalCopy: Bool = false) async {
        if saveLocalCopy {
            let localURL = URL.documentsDirectory.appending(path: fileName)
            try? data.write(to: localURL)
            refreshFiles()
        }

        status = "Subiendo \(fileName)…"
        let boundary = "Boundary-\(UUID().uuidString)"
        var req = URLRequest(url: URL(string: "https://httpbin.org/post")!)
        req.httpMethod = "POST"
        req.timeoutInterval = 15
        req.setValue("multipart/form-data; boundary=\(boundary)", forHTTPHeaderField: "Content-Type")

        var body = Data()
        body.append("--\(boundary)\r\n")
        body.append("Content-Disposition: form-data; name=\"cliente\"\r\n\r\nMercadito iOS\r\n")
        body.append("--\(boundary)\r\n")
        body.append("Content-Disposition: form-data; name=\"archivo\"; filename=\"\(fileName)\"\r\n")
        body.append("Content-Type: \(mimeType)\r\n\r\n")
        body.append(data)
        body.append("\r\n--\(boundary)--\r\n")

        do {
            let (resData, response) = try await URLSession.shared.upload(for: req, from: body)
            let code = (response as? HTTPURLResponse)?.statusCode ?? 0
            let json = try? JSONSerialization.jsonObject(with: resData) as? [String: Any]
            let received = (json?["files"] as? [String: Any])?.keys.joined() ?? fileName
            status = "✅ Subido (\(code)). Recibido: \(received), \(ByteCountFormatter.string(fromByteCount: Int64(data.count), countStyle: .file))"
        } catch {
            status = "⚠️ Guardado en el dispositivo (\(fileName)), sin respuesta de red: \(error.localizedDescription)"
        }
    }

    // MARK: Descarga con progreso
    func download(from url: URL, as name: String) async {
        status = "Descargando \(name)…"
        progress = 0
        downloadName = name
        do {
            let saved: URL = try await withCheckedThrowingContinuation { cont in
                downloadContinuation = cont
                let session = URLSession(configuration: .default, delegate: self, delegateQueue: .main)
                session.downloadTask(with: url).resume()
            }
            status = "✅ Guardado: \(saved.lastPathComponent)"
            refreshFiles()
        } catch {
            status = "❌ Error al descargar: \(error.localizedDescription)"
        }
    }

    func urlSession(_ s: URLSession, downloadTask: URLSessionDownloadTask, didWriteData _: Int64,
                    totalBytesWritten: Int64, totalBytesExpectedToWrite: Int64) {
        if totalBytesExpectedToWrite > 0 {
            progress = Double(totalBytesWritten) / Double(totalBytesExpectedToWrite)
        }
    }

    func urlSession(_ s: URLSession, downloadTask: URLSessionDownloadTask, didFinishDownloadingTo location: URL) {
        let dest = URL.documentsDirectory.appending(path: downloadName)
        try? FileManager.default.removeItem(at: dest)
        do {
            try FileManager.default.moveItem(at: location, to: dest)
            downloadContinuation?.resume(returning: dest)
        } catch {
            downloadContinuation?.resume(throwing: error)
        }
        downloadContinuation = nil
    }

    func urlSession(_ s: URLSession, task: URLSessionTask, didCompleteWithError error: Error?) {
        if let error { downloadContinuation?.resume(throwing: error); downloadContinuation = nil }
    }

    // MARK: Importar desde la app Archivos
    func importFile(_ url: URL) -> Data? {
        let accessed = url.startAccessingSecurityScopedResource()
        defer { if accessed { url.stopAccessingSecurityScopedResource() } }
        let dest = URL.documentsDirectory.appending(path: url.lastPathComponent)
        try? FileManager.default.removeItem(at: dest)
        try? FileManager.default.copyItem(at: url, to: dest)
        status = "📥 Importado: \(url.lastPathComponent)"
        refreshFiles()
        return try? Data(contentsOf: dest)
    }

    func delete(_ url: URL) {
        try? FileManager.default.removeItem(at: url)
        refreshFiles()
    }

    static func mimeType(for url: URL) -> String {
        switch url.pathExtension.lowercased() {
        case "jpg", "jpeg": "image/jpeg"
        case "png": "image/png"
        case "pdf": "application/pdf"
        case "json": "application/json"
        case "txt": "text/plain"
        case "csv": "text/csv"
        default: "application/octet-stream"
        }
    }
}

private extension Data {
    mutating func append(_ string: String) { append(Data(string.utf8)) }
}
