import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
  RegistrationResponseJSON,
  AuthenticationResponseJSON,
} from '@simplewebauthn/server';
import { config } from '../config/index.js';
import { IWebAuthnCredential } from '../models/StudentProfile.js';

export class WebAuthnService {
  /**
   * Generates registration options for passkey enrollment
   */
  static async getRegistrationOptions(userId: string, email: string, existingCredentials: IWebAuthnCredential[]) {
    return await generateRegistrationOptions({
      rpName: config.rpName,
      rpID: config.rpId,
      userID: new TextEncoder().encode(userId),
      userName: email,
      attestationType: 'none',
      excludeCredentials: existingCredentials.map((c) => ({
        id: c.credentialId,
        transports: c.transports as any,
      })),
      authenticatorSelection: {
        residentKey: 'preferred',
        userVerification: 'preferred',
        authenticatorAttachment: 'platform', // Enforce platform biometric authenticator (Windows Hello, Touch ID, Android Biometrics)
      },
    });
  }

  /**
   * Verifies the client registration response
   */
  static async verifyRegistration(
    response: RegistrationResponseJSON,
    expectedChallenge: string
  ) {
    const verification = await verifyRegistrationResponse({
      response,
      expectedChallenge,
      expectedOrigin: config.origin,
      expectedRPID: config.rpId,
    });

    return verification;
  }

  /**
   * Generates authentication options for student verification
   */
  static async getAuthenticationOptions(credentials: IWebAuthnCredential[]) {
    return await generateAuthenticationOptions({
      rpID: config.rpId,
      userVerification: 'preferred',
      allowCredentials: credentials.map((c) => ({
        id: c.credentialId,
        transports: c.transports as any,
      })),
    });
  }

  /**
   * Verifies the client authentication response
   */
  static async verifyAuthentication(
    response: AuthenticationResponseJSON,
    expectedChallenge: string,
    credential: IWebAuthnCredential
  ) {
    const verification = await verifyAuthenticationResponse({
      response,
      expectedChallenge,
      expectedOrigin: config.origin,
      expectedRPID: config.rpId,
      credential: {
        id: credential.credentialId,
        publicKey: Buffer.from(credential.publicKey, 'base64url'),
        counter: credential.counter,
        transports: credential.transports as any,
      },
    });

    return verification;
  }
}

