// Stub for the deprecated `node-domexception` package.
// On Node 16.7+ DOMException is available globally, so we just re-export it.
module.exports = globalThis.DOMException;
module.exports.DOMException = globalThis.DOMException;
