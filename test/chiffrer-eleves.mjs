/* chiffrer-eleves.mjs — chiffre data/correspondance_eleves.json avec un mot de passe.
   Utilise Web Crypto API native Node.js (>=20) — AES-256-GCM + PBKDF2 100k iters.
   Output : data/eleves_chiffre.json (commitable sur GitHub, lisible seulement avec le mot de passe). */

import { readFileSync, writeFileSync } from 'fs';
import { webcrypto } from 'crypto';
const { subtle } = webcrypto;

const PASSWORD = process.argv[2] || 'ifca-raynaud-2026';
console.log(`Mot de passe utilisé : "${PASSWORD}"`);

const src = JSON.parse(readFileSync('data/correspondance_eleves.json', 'utf-8'));
const plaintext = JSON.stringify({ eleves: src.eleves });

const enc = new TextEncoder();
const passwordKey = await subtle.importKey('raw', enc.encode(PASSWORD), { name: 'PBKDF2' }, false, ['deriveKey']);

const salt = webcrypto.getRandomValues(new Uint8Array(16));
const key = await subtle.deriveKey(
  { name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' },
  passwordKey,
  { name: 'AES-GCM', length: 256 },
  false, ['encrypt']
);

const iv = webcrypto.getRandomValues(new Uint8Array(12));
const ciphertext = await subtle.encrypt(
  { name: 'AES-GCM', iv },
  key,
  enc.encode(plaintext)
);

const toB64 = (buf) => Buffer.from(buf).toString('base64');

const output = {
  _meta: {
    description: 'Liste élèves CHIFFRÉE — déverrouillable par mot de passe dans l\'app.',
    algo: 'AES-256-GCM avec PBKDF2(100000 itérations, SHA-256)',
    password_hint: 'mot de passe pédagogique court — voir mode d\'emploi',
    nb_eleves: src.eleves.length,
    chiffre_le: new Date().toISOString()
  },
  salt: toB64(salt),
  iv: toB64(iv),
  ciphertext: toB64(ciphertext)
};

writeFileSync('data/eleves_chiffre.json', JSON.stringify(output, null, 2));
console.log(`✅ data/eleves_chiffre.json écrit (${src.eleves.length} élèves chiffrés).`);
console.log(`   salt: ${output.salt.slice(0,20)}...`);
console.log(`   iv:   ${output.iv}`);
console.log(`   ciphertext: ${output.ciphertext.length} chars base64`);
