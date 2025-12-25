// Barcode Scanner Module
import Quagga from 'https://cdn.jsdelivr.net/npm/@ericblade/quagga2@1.8.4/+esm';
import { showToast } from './ui.js';

let scannerCallback = null;

// Open barcode scanner
function openScanner(callback) {
    scannerCallback = callback;

    const modal = document.getElementById('barcode-modal');
    modal.classList.remove('hidden');

    // Initialize Quagga
    Quagga.init({
        inputStream: {
            name: "Live",
            type: "LiveStream",
            target: document.querySelector('#barcode-scanner'),
            constraints: {
                width: 640,
                height: 480,
                facingMode: "environment" // Use back camera on mobile
            },
        },
        decoder: {
            readers: [
                "code_128_reader",
                "ean_reader",
                "ean_8_reader",
                "code_39_reader",
                "code_39_vin_reader",
                "codabar_reader",
                "upc_reader",
                "upc_e_reader",
                "i2of5_reader"
            ]
        },
        locate: true
    }, function (err) {
        if (err) {
            console.error('Barcode scanner init error:', err);
            showToast('Kamera erişimi başarısız. Lütfen kamera izinlerini kontrol edin.', 'error');
            closeScanner();
            return;
        }
        console.log("Barcode scanner initialized");
        Quagga.start();
    });

    // Listen for barcode detection
    Quagga.onDetected(onBarcodeDetected);
}

// Close barcode scanner
function closeScanner() {
    const modal = document.getElementById('barcode-modal');
    modal.classList.add('hidden');

    Quagga.stop();
    Quagga.offDetected(onBarcodeDetected);

    scannerCallback = null;
}

// Handle barcode detection
function onBarcodeDetected(result) {
    const code = result.codeResult.code;
    console.log('Barcode detected:', code);

    // Call callback with detected barcode
    if (scannerCallback) {
        scannerCallback(code);
    }

    // Close scanner
    closeScanner();
}

// Initialize close button
document.getElementById('close-barcode-modal')?.addEventListener('click', closeScanner);

// Export module
window.barcodeModule = { openScanner, closeScanner };

export { openScanner, closeScanner };
