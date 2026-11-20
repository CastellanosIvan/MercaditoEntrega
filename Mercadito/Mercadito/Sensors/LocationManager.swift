import CoreLocation
import Observation

/// SENSOR 3: GPS (CoreLocation).
/// Obtiene la ubicación, la convierte en dirección (geocodificación inversa)
/// y calcula el costo de envío según la distancia al almacén.
@Observable
final class LocationManager: NSObject, CLLocationManagerDelegate {
    private let manager = CLLocationManager()

    /// Almacén central en Tuxtla Gutiérrez, Chiapas.
    static let warehouse = CLLocation(latitude: 16.7531, longitude: -93.1156)

    var address: String = ""
    var distanceKm: Double?
    var status: CLAuthorizationStatus = .notDetermined
    var isLocating = false
    var errorMessage: String?

    override init() {
        super.init()
        manager.delegate = self
        manager.desiredAccuracy = kCLLocationAccuracyHundredMeters
        status = manager.authorizationStatus
    }

    func request() {
        errorMessage = nil
        isLocating = true
        let current = manager.authorizationStatus
        status = current
        if current == .denied || current == .restricted {
            isLocating = false
            errorMessage = "Permiso de ubicación denegado. Puedes escribir tu dirección o habilitarlo en Ajustes."
            return
        }
        if current == .notDetermined {
            manager.requestWhenInUseAuthorization()
        } else {
            manager.requestLocation()
        }
    }

    func applyPreset(km: Double, address: String) {
        self.errorMessage = nil
        self.isLocating = false
        self.distanceKm = km
        self.address = address
    }

    /// $49 base + $4 por km, envío gratis a menos de 3 km.
    var shippingMXN: Double {
        guard let d = distanceKm else { return 99 }
        return d < 3 ? 0 : (49 + d * 4).rounded()
    }

    func locationManagerDidChangeAuthorization(_ manager: CLLocationManager) {
        status = manager.authorizationStatus
        if status == .authorizedWhenInUse || status == .authorizedAlways {
            manager.requestLocation()
        } else if status == .denied || status == .restricted {
            isLocating = false
            errorMessage = "Permiso de ubicación denegado. Puedes ingresar tu dirección manualmente."
        }
    }

    func locationManager(_ manager: CLLocationManager, didUpdateLocations locations: [CLLocation]) {
        guard let loc = locations.last else {
            isLocating = false
            return
        }
        distanceKm = loc.distance(from: Self.warehouse) / 1000
        Task { @MainActor in
            defer { self.isLocating = false }
            if let p = try? await CLGeocoder().reverseGeocodeLocation(loc).first {
                let parts = [p.thoroughfare, p.subThoroughfare, p.locality, p.administrativeArea]
                    .compactMap { $0 }
                if !parts.isEmpty {
                    address = parts.joined(separator: ", ")
                } else {
                    address = String(format: "Lat: %.4f, Lng: %.4f", loc.coordinate.latitude, loc.coordinate.longitude)
                }
            } else {
                address = String(format: "Lat: %.4f, Lng: %.4f", loc.coordinate.latitude, loc.coordinate.longitude)
            }
        }
    }

    func locationManager(_ manager: CLLocationManager, didFailWithError error: Error) {
        isLocating = false
        errorMessage = "No se pudo obtener la ubicación GPS. Puedes escribir tu dirección manualmente."
    }
}
