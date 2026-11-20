# 🛍 Mercadito — Aplicación para Comercio Electrónico en iPhone (SwiftUI + Xcode)

## Cómo ejecutarlo en Xcode (iPhone real o Simulador)
1. Abre la carpeta `Mercadito/` en tu Mac.
2. Haz doble clic en el archivo **`Mercadito.xcodeproj`** (requiere **Xcode 15** o superior, iOS 17.0+).
3. Para instalar en tu **iPhone real**:
   - Conecta tu iPhone por cable o Wi-Fi y selecciónalo en la barra superior de Xcode.
   - En el target **Mercadito ▸ Signing & Capabilities**, elige tu **Team** (tu Apple ID gratuito o de pago).
   - Si marca conflicto de Bundle Identifier, cámbialo por uno único, por ejemplo `com.tunombre.mercadito`.
4. Presiona **▶ (Cmd + R)** para compilar e instalar en tu iPhone.

## Funciones completas para iPhone
| Módulo | Implementación nativa iOS |
|---|---|
| **Catálogo y QR/Barras** | Fake Store API + catálogo curado offline; cada producto genera su **Código QR** (`mercadito://product/...`) y **Código de Barras Code128 / EAN-13** (`750999...`) con `CoreImage`. |
| **Compartir y Deep Links** | `ShareLink` comparte tarjeta PNG con QR + barras o enlace directo `mercadito://product/...`. Al escanear con la app o Cámara del iPhone (`.onOpenURL`), se abre o agrega el producto. |
| **Escáner de cámara y fotos** | `VisionKit` (`DataScannerViewController` con QR, Code128, EAN-13, EAN-8, UPC-E y linterna) + `Vision` (`VNDetectBarcodesRequest`) para escanear códigos desde fotos compartidas + consulta en Open Food Facts. |
| **Compras y Pasarelas de pago** | **Apple Pay** (PassKit con redondeo decimal exacto y modo Demo con Face ID para cuentas personales), **PayPal** (REST v2 Sandbox + Demo interactivo) y **Tarjeta Bancaria** con validación y confirmación por **Face ID / Touch ID**. |
| **Sensores (5)** | Acelerómetro (agitar = deshacer), giroscopio (efecto 3D en producto), GPS `CoreLocation` (cálculo de envío + dirección manual), cámara + linterna y Face ID / Touch ID. |
| **Archivos y Recibos PDF** | Subida multipart, descarga con progreso, importar/exportar pedidos JSON, QuickLook y generación de recibo PDF con código QR de verificación. |

## Estructura del proyecto (`Mercadito.xcodeproj`)
```
Mercadito/
├── Info.plist  Esquema URL mercadito:// para deep links y PayPal
├── App/        MercaditoApp.swift (@main), ContentView.swift (pestañas + .onOpenURL)
├── Models/     Models.swift (structs Codable + effectiveBarcode + qrDeepLinkURL)
├── Services/   APIService.swift, CartStore.swift, CodeGenerator.swift (CoreImage + Vision)
├── Sensors/    MotionManager, LocationManager, BiometricAuth
├── Payments/   ApplePayManager, PayPalService
├── Files/      FileTransferService, ReceiptPDF
└── Views/      CatalogView (+ QR/Barras), ScannerView (+ Foto/Linterna), CartView (+ Checkout), FilesView (+ Pedidos)
```
