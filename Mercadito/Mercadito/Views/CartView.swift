import SwiftUI
import PassKit
import UIKit

struct CartView: View {
    @Environment(CartStore.self) private var store
    @Environment(MotionManager.self) private var motion
    @State private var showCheckout = false
    @State private var toast: String?

    var body: some View {
        NavigationStack {
            Group {
                if store.items.isEmpty {
                    VStack(spacing: 16) {
                        ContentUnavailableView("Tu carrito está vacío", systemImage: "cart",
                            description: Text("Tip: si borras algo por error, agita el iPhone para recuperarlo."))

                        if let removed = store.lastRemoved {
                            Button {
                                if store.undoRemove() {
                                    showToast("↩️ Artículo recuperado")
                                }
                            } label: {
                                Label("Restaurar «\(removed.product.title.prefix(24))…»", systemImage: "arrow.uturn.backward")
                            }
                            .buttonStyle(.bordered)
                        }
                    }
                } else {
                    List {
                        if let removed = store.lastRemoved {
                            Section {
                                HStack {
                                    Text("Eliminaste «\(removed.product.title.prefix(20))…»")
                                        .font(.caption)
                                        .foregroundStyle(.secondary)
                                    Spacer()
                                    Button("Deshacer") {
                                        if store.undoRemove() {
                                            showToast("↩️ Artículo recuperado")
                                        }
                                    }
                                    .font(.caption.bold())
                                }
                            }
                        }

                        ForEach(store.items) { item in
                            HStack {
                                AsyncImage(url: item.product.image) { $0.resizable().scaledToFit() } placeholder: { ProgressView() }
                                    .frame(width: 50, height: 50)
                                VStack(alignment: .leading) {
                                    Text(item.product.title).lineLimit(1)
                                    Text(store.mxn(item.product.price).mxnText).font(.caption).foregroundStyle(.secondary)
                                }
                                Spacer()
                                Stepper("\(item.quantity)", value: Binding(
                                    get: { item.quantity },
                                    set: { store.setQuantity($0, for: item) }), in: 0...20)
                                    .fixedSize()
                            }
                        }
                        .onDelete { idx in idx.map { store.items[$0] }.forEach(store.remove) }

                        Section {
                            LabeledContent("Subtotal", value: store.subtotalMXN.mxnText).bold()
                        }
                    }
                    .safeAreaInset(edge: .bottom) {
                        Button { showCheckout = true } label: {
                            Text("Pagar \(store.subtotalMXN.mxnText)").bold().frame(maxWidth: .infinity)
                        }
                        .buttonStyle(.borderedProminent)
                        .tint(.primary)
                        .controlSize(.large)
                        .padding()
                        .background(.ultraThinMaterial)
                    }
                }
            }
            .navigationTitle("Carrito")
            .sheet(isPresented: $showCheckout) { CheckoutView() }
            .overlay(alignment: .top) {
                if let toast {
                    Text(toast).padding().background(.thinMaterial, in: .capsule)
                        .transition(.move(edge: .top).combined(with: .opacity))
                }
            }
            // ACELERÓMETRO: agitar = deshacer eliminación
            .onChange(of: motion.shakeCount) {
                if store.undoRemove() {
                    showToast("↩️ Artículo recuperado")
                }
            }
            .sensoryFeedback(.impact, trigger: motion.shakeCount)
        }
    }

    private func showToast(_ text: String) {
        withAnimation { toast = text }
        Task {
            try? await Task.sleep(for: .seconds(2))
            withAnimation { toast = nil }
        }
    }
}

struct CheckoutView: View {
    @Environment(CartStore.self) private var store
    @Environment(\.dismiss) private var dismiss
    @State private var location = LocationManager()
    @State private var applePay = ApplePayManager()
    @State private var method: PaymentMethod = .applePay
    @State private var processing = false
    @State private var completed: Order?
    @State private var error: String?

    // Dirección editable si el usuario no desea o no puede usar GPS
    @State private var manualAddress = ""

    // Campos para pago con Tarjeta Bancaria en iPhone
    @State private var cardHolder = ""
    @State private var cardNumber = ""
    @State private var cardExpiry = ""
    @State private var cardCVV = ""

    // Flujo interactivo PayPal Demo si no hay Sandbox Client ID configurado
    @State private var showPayPalDemoSheet = false

    private var effectiveAddress: String {
        let trimmed = manualAddress.trimmingCharacters(in: .whitespacesAndNewlines)
        if !trimmed.isEmpty { return trimmed }
        if !location.address.isEmpty { return location.address }
        return "Entrega estándar en sucursal / domicilio"
    }

    private var total: Double { store.subtotalMXN + location.shippingMXN }

    private var isCardValid: Bool {
        let digits = cardNumber.filter(\.isNumber)
        let expiryDigits = cardExpiry.filter(\.isNumber)
        let cvvDigits = cardCVV.filter(\.isNumber)
        return !cardHolder.trimmingCharacters(in: .whitespaces).isEmpty &&
               digits.count >= 15 &&
               expiryDigits.count == 4 &&
               cvvDigits.count >= 3
    }

    var body: some View {
        NavigationStack {
            Form {
                Section("Entrega (GPS / Dirección)") {
                    Button {
                        location.request()
                    } label: {
                        HStack {
                            Label(location.isLocating ? "Obteniendo ubicación GPS…" : "Usar mi ubicación GPS actual",
                                  systemImage: "location.fill")
                            Spacer()
                            if location.isLocating { ProgressView() }
                        }
                    }

                    if !location.address.isEmpty {
                        Label(location.address, systemImage: "mappin.and.ellipse")
                            .font(.callout)
                    }
                    if let d = location.distanceKm {
                        Text("A \(d, specifier: "%.1f") km del almacén (\(d < 3 ? "Envío gratis" : "Tarifa dinámica"))")
                            .font(.caption)
                            .foregroundStyle(.secondary)
                    }

                    if let locError = location.errorMessage {
                        Text(locError)
                            .font(.caption)
                            .foregroundStyle(.orange)
                        if location.status == .denied, let settingsURL = URL(string: UIApplication.openSettingsURLString) {
                            Link("Abrir Ajustes de Privacidad", destination: settingsURL)
                                .font(.caption)
                        }
                    }

                    TextField("Dirección de entrega (calle, número, colonia)", text: $manualAddress)
                        .textContentType(.fullStreetAddress)

                    HStack {
                        Text("Zonas prueba:")
                            .font(.caption).foregroundStyle(.secondary)
                        Button("Local (<3 km)") {
                            location.applyPreset(km: 1.8, address: "Av. Central Poniente 554, Tuxtla Gutiérrez")
                            manualAddress = location.address
                        }
                        .font(.caption).buttonStyle(.bordered)
                        Button("Nacional") {
                            location.applyPreset(km: 840, address: "Paseo de la Reforma 222, CDMX")
                            manualAddress = location.address
                        }
                        .font(.caption).buttonStyle(.bordered)
                    }
                }

                Section("Resumen") {
                    LabeledContent("Subtotal", value: store.subtotalMXN.mxnText)
                    LabeledContent("Envío", value: location.shippingMXN == 0 ? "Gratis" : location.shippingMXN.mxnText)
                    LabeledContent("Total", value: total.mxnText).bold()
                }

                Section("Método de pago") {
                    Picker("Método", selection: $method) {
                        ForEach(PaymentMethod.allCases, id: \.self) { Text($0.rawValue) }
                    }
                    .pickerStyle(.segmented)

                    if method == .card {
                        TextField("Nombre del titular", text: $cardHolder)
                            .textContentType(.name)
                        TextField("Número de tarjeta (16 dígitos)", text: $cardNumber)
                            .keyboardType(.numberPad)
                            .onChange(of: cardNumber) { _, newValue in
                                let digits = String(newValue.filter(\.isNumber).prefix(16))
                                cardNumber = stride(from: 0, to: digits.count, by: 4).map {
                                    let start = digits.index(digits.startIndex, offsetBy: $0)
                                    let end = digits.index(start, offsetBy: min(4, digits.count - $0))
                                    return String(digits[start..<end])
                                }.joined(separator: " ")
                            }
                        HStack {
                            TextField("MM/AA", text: $cardExpiry)
                                .keyboardType(.numberPad)
                                .onChange(of: cardExpiry) { _, newValue in
                                    let digits = String(newValue.filter(\.isNumber).prefix(4))
                                    if digits.count > 2 {
                                        cardExpiry = "\(digits.prefix(2))/\(digits.dropFirst(2))"
                                    } else {
                                        cardExpiry = digits
                                    }
                                }
                            SecureField("CVV", text: $cardCVV)
                                .keyboardType(.numberPad)
                                .onChange(of: cardCVV) { _, newValue in
                                    cardCVV = String(newValue.filter(\.isNumber).prefix(4))
                                }
                        }
                    }
                }

                Section {
                    switch method {
                    case .applePay:
                        if ApplePayManager.canPay {
                            PayWithApplePayButton(.buy) { Task { await pay() } }
                                .frame(height: 48)
                                .disabled(processing)
                        }
                        if !ApplePayManager.canPay || ApplePayManager.demoMode {
                            Button { Task { await pay() } } label: {
                                Label(
                                    ApplePayManager.canPay ? "Pagar con Apple Pay + Face ID (Demo)" : "Autorizar compra con Face ID",
                                    systemImage: "faceid"
                                )
                                .bold()
                                .frame(maxWidth: .infinity, minHeight: 40)
                            }
                            .buttonStyle(.borderedProminent)
                            .tint(.primary)
                            .disabled(processing)
                        }
                    case .payPal:
                        Button { Task { await pay() } } label: {
                            Text("Pagar con PayPal (\(total.mxnText))")
                                .bold()
                                .frame(maxWidth: .infinity, minHeight: 40)
                        }
                        .buttonStyle(.borderedProminent)
                        .tint(Color(red: 0, green: 0.19, blue: 0.53))
                        .disabled(processing)
                    case .card:
                        Button { Task { await pay() } } label: {
                            Label("Pagar \(total.mxnText) con Tarjeta", systemImage: "creditcard.fill")
                                .bold()
                                .frame(maxWidth: .infinity, minHeight: 40)
                        }
                        .buttonStyle(.borderedProminent)
                        .tint(.primary)
                        .disabled(processing || !isCardValid)
                    }

                    if processing { ProgressView("Procesando pago…") }
                    if let error { Text(error).foregroundStyle(.red) }
                } footer: {
                    Text("Se solicitará Face ID / Touch ID o código del iPhone antes de confirmar la compra.")
                }
            }
            .navigationTitle("Checkout")
            .toolbar { Button("Cerrar") { dismiss() } }
            .onChange(of: location.address) { _, newAddress in
                if manualAddress.isEmpty && !newAddress.isEmpty {
                    manualAddress = newAddress
                }
            }
            .sheet(isPresented: $showPayPalDemoSheet) {
                PayPalDemoApprovalView(totalMXN: total) { approved in
                    showPayPalDemoSheet = false
                    if approved { finish(.payPal) } else { error = "Pago con PayPal cancelado" }
                }
            }
            .sheet(item: $completed, onDismiss: { dismiss() }) { OrderSuccessView(order: $0) }
        }
    }

    private func pay() async {
        error = nil
        // SENSOR: Face ID / Touch ID
        guard await BiometricAuth.authenticate() else {
            error = "Autenticación cancelada"
            return
        }
        processing = true
        defer { processing = false }

        switch method {
        case .applePay:
            let ok = await withCheckedContinuation { cont in
                applePay.pay(items: store.items, subtotal: store.subtotalMXN,
                             shipping: location.shippingMXN, rate: store.usdToMXN) { cont.resume(returning: $0) }
            }
            if ok { finish(.applePay) } else { error = "Pago con Apple Pay no completado" }
        case .payPal:
            if PayPalService.shared.isConfigured {
                do {
                    if try await PayPalService.shared.pay(totalMXN: total) { finish(.payPal) }
                    else { error = "Pago con PayPal cancelado" }
                } catch { self.error = "PayPal: \(error.localizedDescription)" }
            } else {
                showPayPalDemoSheet = true
            }
        case .card:
            try? await Task.sleep(for: .milliseconds(500))
            finish(.card)
        }
    }

    private func finish(_ m: PaymentMethod) {
        completed = store.placeOrder(method: m, shipping: location.shippingMXN, address: effectiveAddress)
    }
}

struct PayPalDemoApprovalView: View {
    let totalMXN: Double
    let onResult: (Bool) -> Void

    var body: some View {
        NavigationStack {
            VStack(spacing: 20) {
                Image(systemName: "p.circle.fill")
                    .font(.system(size: 56))
                    .foregroundStyle(Color(red: 0, green: 0.19, blue: 0.53))
                Text("PayPal Sandbox (Modo Demo)")
                    .font(.title3.bold())
                Text("Monto a autorizar: \(totalMXN.mxnText)")
                    .font(.headline)
                Text("Para usar PayPal real en producción o Sandbox, configura tu Client ID y Secret en PayPalService.swift.")
                    .font(.caption)
                    .foregroundStyle(.secondary)
                    .multilineTextAlignment(.center)
                    .padding(.horizontal)

                Button {
                    onResult(true)
                } label: {
                    Text("Autorizar pago de \(totalMXN.mxnText)")
                        .bold()
                        .frame(maxWidth: .infinity)
                }
                .buttonStyle(.borderedProminent)
                .tint(Color(red: 0, green: 0.19, blue: 0.53))
                .controlSize(.large)

                Button("Cancelar", role: .cancel) {
                    onResult(false)
                }
            }
            .padding(24)
            .presentationDetents([.medium])
        }
    }
}

struct OrderSuccessView: View {
    let order: Order
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        VStack(spacing: 20) {
            Image(systemName: "checkmark.circle.fill")
                .font(.system(size: 72))
                .foregroundStyle(.primary)
                .symbolEffect(.bounce, value: true)
            Text("¡Pago exitoso!").font(.title.bold()).foregroundStyle(.primary)
            Text("Total: \(order.totalMXN.mxnText) con \(order.method.rawValue)")
                .font(.subheadline).foregroundStyle(.secondary)
            Text("Envío: \(order.address)")
                .font(.caption).foregroundStyle(.secondary)
                .multilineTextAlignment(.center)
            if let name = order.receiptFileName {
                ShareLink(item: URL.documentsDirectory.appending(path: name)) {
                    Label("Compartir recibo PDF", systemImage: "doc.richtext")
                        .frame(maxWidth: .infinity)
                }
                .buttonStyle(.borderedProminent)
                .tint(.primary)
                .controlSize(.large)
            }
            Button("Continuar") { dismiss() }
                .buttonStyle(.bordered)
        }
        .padding(24)
        .presentationDetents([.medium])
    }
}
