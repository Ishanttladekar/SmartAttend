import crypto from 'crypto';

export function generateNonce(length = 24): string {
  return crypto.randomBytes(length).toString('hex');
}

export function generateJoinCode(length = 6): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Disambiguated characters
  let code = '';
  for (let i = 0; i < length; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

