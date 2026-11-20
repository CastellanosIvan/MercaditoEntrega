import Foundation
import UIKit
import CoreImage
import CoreImage.CIFilterBuiltins
import Vision

/// Generador y lector nativo de códigos QR y códigos de barras Code128 / EAN-13 para iOS.
enum CodeGenerator {
    private static let context = CIContext()

    // MARK: - Formato determinístico compatible entre Web e iPhone

    /// Calcula el dígito verificador EAN-13 estándar (módulo 10) para 12 dígitos.
    static func ean13CheckDigit(for twelveDigits: String) -> Character {
        let digits = twelveDigits.compactMap { $0.wholeNumberValue }
        guard digits.count == 12 else { return "0" }
        var sum = 0
        for (index, digit) in digits.enumerated() {
            sum += (index % 2 == 0) ? digit : digit * 3
        }
        let check = (10 - (sum % 10)) % 10
        return Character(String(check))
    }

    /// Genera un código EAN-13 único por producto con prefijo 750999 (ej. 7509990001015).
    static func barcodeString(forProductID id: Int) -> String {
        let normalized = abs(id) % 1_000_000
        let base12 = String(format: "750999%06d", normalized)
        return base12 + String(ean13CheckDigit(for: base12))
    }

    /// Construye el enlace profundo `mercadito://product/...` que va dentro del QR.
    static func qrURL(for product: Product) -> URL {
        var components = URLComponents()
        components.scheme = "mercadito"
        components.host = "product"
        components.path = "/\(product.id)"

        let shortTitle = String(product.title.prefix(60))
        components.queryItems = [
            URLQueryItem(name: "code", value: product.effectiveBarcode),
            URLQueryItem(name: "p", value: String(format: "%.2f", product.price)),
            URLQueryItem(name: "t", value: shortTitle),
            URLQueryItem(name: "c", value: product.category)
        ]
        return components.url ?? URL(string: "mercadito://product/\(product.id)")!
    }

    // MARK: - Parser para QR y códigos de barras escaneados

    struct ParsedMercaditoCode {
        let productID: Int?
        let barcode: String?
        let title: String?
        let priceUSD: Double?
        let category: String?
    }

    /// Detecta si un string escaneado corresponde a un producto generado por Mercadito
    /// (enlace `mercadito://product/...`, parámetro `?product=` de web, o código `750999XXXXXXC`).
    static func parseMercaditoCode(_ raw: String) -> ParsedMercaditoCode? {
        let trimmed = raw.trimmingCharacters(in: .whitespacesAndNewlines)

        // 1) Deep link `mercadito://product/<id>?...` o URL web con `?product=<id>`
        if let url = URL(string: trimmed), let components = URLComponents(url: url, resolvingAgainstBaseURL: false) {
            if url.scheme?.lowercased() == "mercadito", url.host?.lowercased() == "product" {
                let idString = url.pathComponents.last(where: { $0 != "/" }) ?? ""
                let id = Int(idString)
                let items = components.queryItems ?? []
                let code = items.first(where: { $0.name == "code" })?.value
                let price = items.first(where: { $0.name == "p" })?.value.flatMap(Double.init)
                let title = items.first(where: { $0.name == "t" })?.value
                let category = items.first(where: { $0.name == "c" })?.value
                if id != nil || code != nil {
                    return ParsedMercaditoCode(productID: id, barcode: code, title: title, priceUSD: price, category: category)
                }
            }

            if let queryID = components.queryItems?.first(where: { $0.name == "product" })?.value,
               let id = Int(queryID) {
                return ParsedMercaditoCode(
                    productID: id,
                    barcode: barcodeString(forProductID: id),
                    title: nil,
                    priceUSD: nil,
                    category: nil
                )
            }
        }

        // 2) Código de barras Mercadito `750999XXXXXXC` (13 dígitos)
        if trimmed.count == 13, trimmed.hasPrefix("750999"), trimmed.allSatisfy(\.isNumber) {
            let idSlice = String(trimmed.dropFirst(6).prefix(6))
            if let id = Int(idSlice) {
                return ParsedMercaditoCode(
                    productID: id,
                    barcode: trimmed,
                    title: nil,
                    priceUSD: nil,
                    category: nil
                )
            }
        }

        return nil
    }

    // MARK: - Generación de imágenes nítidas con CoreImage

    /// Genera un código QR nítido con margen blanco (quiet zone) para escanear en claro u oscuro.
    static func generateQRImage(from string: String, size: CGFloat = 240) -> UIImage? {
        let filter = CIFilter.qrCodeGenerator()
        filter.message = Data(string.utf8)
        filter.correctionLevel = "M"
        guard let output = filter.outputImage else { return nil }
        return renderCrispBarcode(ciImage: output, targetSize: CGSize(width: size, height: size), padding: 14)
    }

    /// Genera un código de barras Code128 nítido con margen blanco para escanear con cámara.
    static func generateBarcodeImage(from string: String, width: CGFloat = 300, height: CGFloat = 96) -> UIImage? {
        let filter = CIFilter.code128BarcodeGenerator()
        filter.message = Data(string.utf8)
        filter.quietSpace = 8
        guard let output = filter.outputImage else { return nil }
        return renderCrispBarcode(ciImage: output, targetSize: CGSize(width: width, height: height), padding: 10)
    }

    private static func renderCrispBarcode(ciImage: CIImage, targetSize: CGSize, padding: CGFloat) -> UIImage? {
        let extent = ciImage.extent
        guard extent.width > 0, extent.height > 0 else { return nil }

        // Convertimos primero a CGImage a escala nativa 1x y luego escalamos sin interpolación
        guard let cgImage = context.createCGImage(ciImage, from: extent) else { return nil }

        let renderer = UIGraphicsImageRenderer(size: targetSize)
        return renderer.image { ctx in
            UIColor.white.setFill()
            ctx.fill(CGRect(origin: .zero, size: targetSize))

            let drawRect = CGRect(
                x: padding,
                y: padding,
                width: max(1, targetSize.width - padding * 2),
                height: max(1, targetSize.height - padding * 2)
            )
            let cgCtx = ctx.cgContext
            cgCtx.interpolationQuality = .none
            cgCtx.translateBy(x: 0, y: targetSize.height)
            cgCtx.scaleBy(x: 1, y: -1)
            let flippedRect = CGRect(
                x: drawRect.origin.x,
                y: targetSize.height - drawRect.origin.y - drawRect.height,
                width: drawRect.width,
                height: drawRect.height
            )
            cgCtx.draw(cgImage, in: flippedRect)
        }
    }

    // MARK: - Detección desde imágenes compartidas (Vision)

    /// Permite escanear códigos QR o de barras desde capturas o tarjetas compartidas en Fotos.
    static func detectCodes(in image: UIImage) async -> [String] {
        guard let cgImage = image.cgImage else { return [] }
        return await withCheckedContinuation { continuation in
            let request = VNDetectBarcodesRequest { req, _ in
                let results = (req.results as? [VNBarcodeObservation]) ?? []
                let payloads = results.compactMap(\.payloadStringValue)
                continuation.resume(returning: payloads)
            }
            request.symbologies = [.qr, .code128, .ean13, .ean8, .upce, .code39]
            let handler = VNImageRequestHandler(cgImage: cgImage, options: [:])
            DispatchQueue.global(qos: .userInitiated).async {
                do {
                    try handler.perform([request])
                } catch {
                    continuation.resume(returning: [])
                }
            }
        }
    }
}
