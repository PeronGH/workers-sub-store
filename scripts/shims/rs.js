// Replaces `@/utils/rs`: jsrsasign seeds its RNG with crypto.getRandomValues() at import time,
// which workerd forbids in global scope. Mirrors jsrsasign's pemtohex() + sha256 fingerprint.
import { sha256 } from '@noble/hashes/sha2.js';

export function generateFingerprint(caStr) {
    if (!caStr.includes('-----BEGIN ')) throw new Error("can't find PEM header");
    const base64 = caStr
        .replace(/^[^]*-----BEGIN [^-]+-----/, '')
        .replace(/-----END [^-]+-----[^]*$/, '')
        .replace(/[^A-Za-z0-9+/=]/g, '');
    const der = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
    return Array.from(sha256(der), (b) => b.toString(16).padStart(2, '0'))
        .join(':')
        .toUpperCase();
}

export default { generateFingerprint };
