const crypto = require("node:crypto");

// Polyfill globalThis.crypto
if (!globalThis.crypto) {
  globalThis.crypto = crypto.webcrypto;
}

// Polyfill the crypto module itself for Vite's internal usage
if (!crypto.getRandomValues && crypto.webcrypto) {
  crypto.getRandomValues = function (array) {
    return crypto.webcrypto.getRandomValues(array);
  };
}
