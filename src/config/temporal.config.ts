import '@js-temporal/polyfill';
import { Temporal } from '@js-temporal/polyfill';

/**
 * Configuración global de Temporal API
 * Este archivo debe importarse en main.ts antes que cualquier otro código
 */
export const temporalConfig = {
  // Configuración por defecto para zonas horarias
  defaultTimeZone: 'America/Bogota', // Zona horaria de Colombia
  
  // Formato por defecto para fechas
  dateFormat: 'YYYY-MM-DD',
  
  // Formato por defecto para fechas con hora
  dateTimeFormat: 'YYYY-MM-DDTHH:mm:ss[Z]',
};

// Exportar tipos útiles
export type TemporalDate = Temporal.PlainDate;
export type TemporalDateTime = Temporal.ZonedDateTime;
export type TemporalTime = Temporal.PlainTime;

