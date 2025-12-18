import { ConfigService } from '@nestjs/config';
import neo4j, { Driver, Session } from 'neo4j-driver';

export interface Neo4jConfig {
  uri: string;
  user: string;
  password: string;
  database?: string;
}

export const getNeo4jConfig = (configService: ConfigService): Neo4jConfig => {
  return {
    uri: configService.get<string>('NEO4J_URI') || 'bolt://localhost:7687',
    user: configService.get<string>('NEO4J_USER') || 'neo4j',
    password: configService.get<string>('NEO4J_PASSWORD') || 'password',
    database: configService.get<string>('NEO4J_DATABASE') || 'neo4j',
  };
};

export const createNeo4jDriver = (config: Neo4jConfig): Driver | null => {
  // Si no hay credenciales configuradas, retornar null
  if (!config.uri || !config.user || !config.password) {
    return null;
  }
  
  return neo4j.driver(
    config.uri,
    neo4j.auth.basic(config.user, config.password),
    {
      // Configuración de encriptación compatible con Neo4j 5.x
      encrypted: 'ENCRYPTION_OFF', // Para desarrollo local/Docker
      trust: 'TRUST_ALL_CERTIFICATES',
    },
  );
};
