import CoreMotion
import Observation

/// SENSORES 1 y 2: acelerómetro + giroscopio (CoreMotion).
///  - Acelerómetro: detecta "agitar" → deshacer la última eliminación del carrito.
///  - Giroscopio / attitude: inclinación (roll/pitch) → efecto 3D "parallax" en la tarjeta del producto.
@Observable
final class MotionManager {
    private let manager = CMMotionManager()

    var roll: Double = 0     // inclinación izquierda/derecha (radianes)
    var pitch: Double = 0    // inclinación adelante/atrás
    var shakeCount = 0       // cambia cada vez que se detecta una sacudida
    var isAvailable: Bool { manager.isDeviceMotionAvailable }

    private var lastShake = Date.distantPast

    func start() {
        guard manager.isDeviceMotionAvailable else { return }   // en el simulador no hay sensores
        guard !manager.isDeviceMotionActive else { return }
        manager.deviceMotionUpdateInterval = 1.0 / 30.0
        manager.startDeviceMotionUpdates(to: .main) { [weak self] data, _ in
            guard let self, let data else { return }

            // Giroscopio (fusionado en attitude)
            self.roll = data.attitude.roll
            self.pitch = data.attitude.pitch

            // Acelerómetro (aceleración del usuario sin gravedad, en g)
            let a = data.userAcceleration
            let magnitude = (a.x * a.x + a.y * a.y + a.z * a.z).squareRoot()
            if magnitude > 1.85, Date.now.timeIntervalSince(self.lastShake) > 1.0 {
                self.lastShake = .now
                self.shakeCount += 1
            }
        }
    }

    func stop() { manager.stopDeviceMotionUpdates() }
}
