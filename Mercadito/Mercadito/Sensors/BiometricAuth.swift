import Foundation
import LocalAuthentication

/// SENSOR 4: Face ID / Touch ID — se pide antes de cualquier pago.
enum BiometricAuth {
    static func authenticate(reason: String = "Confirma tu identidad para pagar") async -> Bool {
        // Sin NSFaceIDUsageDescription en Info.plist iOS cerraría la app: se omite Face ID
        guard Bundle.main.object(forInfoDictionaryKey: "NSFaceIDUsageDescription") != nil else { return true }
        let context = LAContext()
        var error: NSError?
        // .deviceOwnerAuthentication permite usar el código del iPhone si no hay biometría (simulador)
        guard context.canEvaluatePolicy(.deviceOwnerAuthentication, error: &error) else { return true }
        return (try? await context.evaluatePolicy(.deviceOwnerAuthentication, localizedReason: reason)) ?? false
    }
}
