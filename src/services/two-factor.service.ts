import { Injectable } from '@nestjs/common';
import * as speakeasy from 'speakeasy';
import * as QRCode from 'qrcode';

@Injectable()
export class TwoFactorService {
  /**
   * Genera un secreto 2FA para un usuario
   */
  generateSecret(userEmail: string, serviceName: string = 'Hotel Meducin'): speakeasy.GeneratedSecret {
    return speakeasy.generateSecret({
      name: `${serviceName} (${userEmail})`,
      issuer: serviceName,
      length: 32,
    });
  }

  /**
   * Genera un código QR en formato base64 para el secreto
   */
  async generateQRCode(otpauthUrl: string): Promise<string> {
    try {
      const qrCodeDataUrl = await QRCode.toDataURL(otpauthUrl);
      return qrCodeDataUrl;
    } catch (error) {
      throw new Error(`Error generando código QR: ${error.message}`);
    }
  }

  /**
   * Verifica un código TOTP contra un secreto
   */
  verifyToken(secret: string, token: string): boolean {
    try {
      return speakeasy.totp.verify({
        secret,
        encoding: 'base32',
        token,
        window: 2, // Permite tokens con 2 períodos de tiempo de diferencia (60 segundos cada uno)
      });
    } catch (error) {
      return false;
    }
  }

  /**
   * Genera un token TOTP temporal (útil para testing)
   */
  generateToken(secret: string): string {
    return speakeasy.totp({
      secret,
      encoding: 'base32',
    });
  }
}

