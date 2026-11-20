import PassKit

/// Pasarela 1: Apple Pay (PassKit).
/// Requiere: capacidad "Apple Pay" en Signing & Capabilities y un Merchant ID para cobros reales.
/// Si se ejecuta con una cuenta personal de Apple o en simulador sin Merchant ID, utiliza Modo Demo tras Face ID.
final class ApplePayManager: NSObject, PKPaymentAuthorizationControllerDelegate {
    static let merchantID = "merchant.com.tuequipo.mercadito"   // ← cámbialo por el tuyo si usas Apple Developer de pago

    /// Ponlo en `false` cuando tengas el Merchant ID y la capacidad Apple Pay configurados.
    static let demoMode = true

    private var completion: ((Bool) -> Void)?
    private var success = false

    static var canPay: Bool {
        PKPaymentAuthorizationController.canMakePayments(usingNetworks: [.visa, .masterCard, .amex])
    }

    private static let rounder = NSDecimalNumberHandler(
        roundingMode: .plain,
        scale: 2,
        raiseOnExactness: false,
        raiseOnOverflow: false,
        raiseOnUnderflow: false,
        raiseOnDivideByZero: false
    )

    private static func decimal(_ value: Double) -> NSDecimalNumber {
        NSDecimalNumber(value: max(0, value)).rounding(accordingToBehavior: rounder)
    }

    func pay(items: [CartItem], subtotal: Double, shipping: Double,
             rate: Double, completion: @escaping (Bool) -> Void) {
        self.completion = completion
        self.success = false

        guard Self.canPay else {
            DispatchQueue.main.async { completion(Self.demoMode) }
            return
        }

        var lineTotal = NSDecimalNumber.zero
        var summary: [PKPaymentSummaryItem] = items.map { item in
            let amount = Self.decimal(item.product.price * rate * Double(item.quantity))
            lineTotal = lineTotal.adding(amount)
            return PKPaymentSummaryItem(
                label: "\(item.quantity)× \(item.product.title.prefix(25))",
                amount: amount
            )
        }

        let shippingDecimal = Self.decimal(shipping)
        lineTotal = lineTotal.adding(shippingDecimal)

        summary.append(PKPaymentSummaryItem(label: "Envío", amount: shippingDecimal))
        summary.append(PKPaymentSummaryItem(label: "Mercadito", amount: lineTotal))

        let request = PKPaymentRequest()
        request.merchantIdentifier = Self.merchantID
        request.countryCode = "MX"
        request.currencyCode = "MXN"
        request.supportedNetworks = [.visa, .masterCard, .amex]
        request.merchantCapabilities = .threeDSecure
        request.paymentSummaryItems = summary
        request.requiredShippingContactFields = [.name, .emailAddress]

        let controller = PKPaymentAuthorizationController(paymentRequest: request)
        controller.delegate = self
        controller.present { presented in
            // Si no hay Merchant ID configurado (cuenta gratuita de Apple), la hoja no aparece.
            if !presented {
                DispatchQueue.main.async { completion(Self.demoMode) }
            }
        }
    }

    func paymentAuthorizationController(_ controller: PKPaymentAuthorizationController,
                                        didAuthorizePayment payment: PKPayment,
                                        handler: @escaping (PKPaymentAuthorizationResult) -> Void) {
        // En producción: enviar payment.token.paymentData a tu backend / procesador (Stripe, Conekta, etc.)
        success = true
        handler(PKPaymentAuthorizationResult(status: .success, errors: nil))
    }

    func paymentAuthorizationControllerDidFinish(_ controller: PKPaymentAuthorizationController) {
        controller.dismiss { [weak self] in
            guard let self else { return }
            DispatchQueue.main.async { self.completion?(self.success) }
        }
    }
}
