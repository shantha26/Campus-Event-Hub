const QRCode = require('qrcode');

/**
 * Generates a QR code as a Data URL from a string or object.
 * @param {string|object} data - The data to encode.
 * @returns {Promise<string>} - A promise that resolves to the Data URL.
 */
exports.generateQR = async (data) => {
  try {
    const stringData = typeof data === 'object' ? JSON.stringify(data) : String(data);
    return await QRCode.toDataURL(stringData, {
      errorCorrectionLevel: 'H',
      margin: 1,
      color: {
        dark: '#000000',
        light: '#ffffff'
      }
    });
  } catch (err) {
    console.error('QR Code generation failed:', err);
    throw new Error('Failed to generate QR code');
  }
};
