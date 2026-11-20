import Foundation
import AuthenticationServices
import UIKit

/// Pasarela 2: PayPal (REST API v2 en SANDBOX) — también es un servicio web JSON.
/// Flujo: OAuth token → crear orden → el usuario aprueba en la web de PayPal → capturar orden.
/// Si no hay credenciales Sandbox configuradas, la vista ofrece un flujo Demo interactivo para iPhone.
final class PayPalService: NSObject, ASWebAuthenticationPresentationContextProviding {
    static let shared = PayPalService()

    // Obténlas gratis en https://developer.paypal.com → Apps & Credentials (Sandbox)
    private let clientID = "TU_CLIENT_ID_SANDBOX"
    private let secret   = "TU_SECRET_SANDBOX"
    private let base     = URL(string: "https://api-m.sandbox.paypal.com")!
    private let callbackScheme = "mercadito"   // registrado en Mercadito/Info.plist

    private var session: ASWebAuthenticationSession?

    var isConfigured: Bool {
        !clientID.isEmpty && !secret.isEmpty &&
        !clientID.contains("TU_CLIENT_ID") && !secret.contains("TU_SECRET")
    }

    // MARK: Paso 1 — token OAuth2
    private func accessToken() async throws -> String {
        var req = URLRequest(url: base.appending(path: "v1/oauth2/token"))
        req.httpMethod = "POST"
        let creds = Data("\(clientID):\(secret)".utf8).base64EncodedString()
        req.setValue("Basic \(creds)", forHTTPHeaderField: "Authorization")
        req.setValue("application/x-www-form-urlencoded", forHTTPHeaderField: "Content-Type")
        req.httpBody = Data("grant_type=client_credentials".utf8)

        struct Token: Decodable { let access_token: String }
        let (data, _) = try await URLSession.shared.data(for: req)
        return try JSONDecoder().decode(Token.self, from: data).access_token
    }

    // MARK: Paso 2 — crear orden (JSON)
    private struct CreatedOrder: Decodable {
        let id: String
        let links: [Link]
        struct Link: Decodable { let href: URL; let rel: String }
    }

    private func createOrder(totalMXN: Double, token: String) async throws -> CreatedOrder {
        var req = URLRequest(url: base.appending(path: "v2/checkout/orders"))
        req.httpMethod = "POST"
        req.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        req.setValue("application/json", forHTTPHeaderField: "Content-Type")
        let body: [String: Any] = [
            "intent": "CAPTURE",
            "purchase_units": [[
                "amount": ["currency_code": "MXN", "value": String(format: "%.2f", totalMXN)],
                "description": "Compra en Mercadito"
            ]],
            "application_context": [
                "return_url": "\(callbackScheme)://paypal/success",
                "cancel_url": "\(callbackScheme)://paypal/cancel",
                "brand_name": "Mercadito",
                "user_action": "PAY_NOW"
            ]
        ]
        req.httpBody = try JSONSerialization.data(withJSONObject: body)
        let (data, _) = try await URLSession.shared.data(for: req)
        return try JSONDecoder().decode(CreatedOrder.self, from: data)
    }

    // MARK: Paso 4 — capturar
    private func capture(orderID: String, token: String) async throws -> Bool {
        var req = URLRequest(url: base.appending(path: "v2/checkout/orders/\(orderID)/capture"))
        req.httpMethod = "POST"
        req.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        req.setValue("application/json", forHTTPHeaderField: "Content-Type")
        struct Captured: Decodable { let status: String }
        let (data, _) = try await URLSession.shared.data(for: req)
        return try JSONDecoder().decode(Captured.self, from: data).status == "COMPLETED"
    }

    // MARK: Flujo completo
    @MainActor
    func pay(totalMXN: Double) async throws -> Bool {
        let token = try await accessToken()
        let order = try await createOrder(totalMXN: totalMXN, token: token)
        guard let approve = order.links.first(where: { $0.rel == "approve" })?.href else { return false }

        // Paso 3 — el usuario aprueba en la página de PayPal
        let callback: URL = try await withCheckedThrowingContinuation { cont in
            let s = ASWebAuthenticationSession(url: approve, callbackURLScheme: callbackScheme) { url, error in
                if let url { cont.resume(returning: url) } else { cont.resume(throwing: error ?? URLError(.cancelled)) }
            }
            s.presentationContextProvider = self
            s.prefersEphemeralWebBrowserSession = true
            self.session = s
            s.start()
        }
        guard callback.absoluteString.contains("success") else { return false }
        return try await capture(orderID: order.id, token: token)
    }

    func presentationAnchor(for session: ASWebAuthenticationSession) -> ASPresentationAnchor {
        let scenes = UIApplication.shared.connectedScenes.compactMap { $0 as? UIWindowScene }
        return scenes.flatMap(\.windows).first(where: \.isKeyWindow)
            ?? scenes.first?.windows.first
            ?? ASPresentationAnchor()
    }
}
