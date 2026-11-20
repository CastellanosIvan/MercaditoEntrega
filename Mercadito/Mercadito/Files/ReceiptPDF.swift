import UIKit

/// Genera el recibo del pedido como PDF en Documents con salto de página automático y código QR de verificación.
enum ReceiptPDF {
    static func generate(for order: Order) throws -> URL {
        let url = URL.documentsDirectory.appending(path: "Recibo-\(order.id.uuidString.prefix(8)).pdf")
        let page = CGRect(x: 0, y: 0, width: 612, height: 792)  // carta
        let renderer = UIGraphicsPDFRenderer(bounds: page)

        try renderer.writePDF(to: url) { ctx in
            ctx.beginPage()
            var y: CGFloat = 50

            func checkPageBreak(_ neededHeight: CGFloat) {
                if y + neededHeight > 740 {
                    ctx.beginPage()
                    y = 50
                }
            }

            func draw(_ text: String, size: CGFloat = 12, bold: Bool = false, color: UIColor = .black) {
                let font = bold ? UIFont.boldSystemFont(ofSize: size) : UIFont.systemFont(ofSize: size)
                let attr: [NSAttributedString.Key: Any] = [.font: font, .foregroundColor: color]
                let maxRect = CGSize(width: 512, height: 400)
                let h = (text as NSString).boundingRect(with: maxRect, options: .usesLineFragmentOrigin,
                                                        attributes: attr, context: nil).height
                checkPageBreak(h + 8)
                let rect = CGRect(x: 50, y: y, width: 512, height: h + 4)
                (text as NSString).draw(in: rect, withAttributes: attr)
                y += h + 8
            }

            draw("Mercadito", size: 26, bold: true, color: .black)
            draw("Recibo oficial de compra", size: 15, bold: true, color: .darkGray)
            draw("Pedido: \(order.id.uuidString)")
            draw("Fecha: \(order.date.formatted(date: .long, time: .shortened))")
            draw("Método de pago: \(order.method.rawValue)")
            draw("Envío a: \(order.address.isEmpty ? "Entrega estándar" : order.address)")
            y += 10

            draw("Artículos:", size: 13, bold: true)
            for item in order.items {
                let line = item.product.price * Double(item.quantity)
                draw("• \(item.quantity) × \(item.product.title)  —  US$\(String(format: "%.2f", line))  (EAN: \(item.product.effectiveBarcode))")
            }
            y += 10
            draw("Subtotal: \(order.subtotalMXN.mxnText)", bold: true)
            draw("Envío: \(order.shippingMXN == 0 ? "Gratis" : order.shippingMXN.mxnText)", bold: true)
            draw("TOTAL: \(order.totalMXN.mxnText)", size: 18, bold: true, color: .black)

            if let qrImage = CodeGenerator.generateQRImage(from: "mercadito://order/\(order.id.uuidString)", size: 110) {
                checkPageBreak(130)
                y += 14
                qrImage.draw(in: CGRect(x: 50, y: y, width: 96, height: 96))
                let noteAttr: [NSAttributedString.Key: Any] = [
                    .font: UIFont.systemFont(ofSize: 10),
                    .foregroundColor: UIColor.gray
                ]
                ("Comprobante digital verificado\nID: \(order.id.uuidString.prefix(8))" as NSString)
                    .draw(in: CGRect(x: 158, y: y + 26, width: 380, height: 50), withAttributes: noteAttr)
                y += 110
            }

            draw("Gracias por tu compra en Mercadito. Documento generado en el dispositivo.", size: 10, color: .gray)
        }
        return url
    }
}
