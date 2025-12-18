import { readFileSync } from 'fs';
import { join } from 'path';
import { ConfigService } from '@nestjs/config';

export interface SSLConfig {
  key?: Buffer;
  cert?: Buffer;
  httpsEnabled: boolean;
}

export const getSSLConfig = (configService: ConfigService): SSLConfig => {
  const httpsEnabled = configService.get<string>('HTTPS_ENABLED') === 'true';
  
  if (!httpsEnabled) {
    return { httpsEnabled: false };
  }

  const certPath = configService.get<string>('SSL_CERT_PATH') || join(process.cwd(), 'certs', 'cert.pem');
  const keyPath = configService.get<string>('SSL_KEY_PATH') || join(process.cwd(), 'certs', 'key.pem');

  try {
    const cert = readFileSync(certPath);
    const key = readFileSync(keyPath);

    return {
      key,
      cert,
      httpsEnabled: true,
    };
  } catch (error) {
    console.warn('⚠️  No se pudieron cargar los certificados SSL. HTTPS deshabilitado.');
    console.warn('   Asegúrate de que los certificados existan en:', certPath, keyPath);
    return { httpsEnabled: false };
  }
};

