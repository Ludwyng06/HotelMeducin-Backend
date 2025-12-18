import '@js-temporal/polyfill';
import { Temporal } from '@js-temporal/polyfill';
import { temporalConfig } from '../../config/temporal.config';

/**
 * Utilidades para conversión entre Date nativo y Temporal API
 */
export class TemporalUtils {
  /**
   * Convierte Date nativo a PlainDate
   */
  static dateToPlainDate(date: Date): Temporal.PlainDate {
    const isoString = date.toISOString().split('T')[0]; // YYYY-MM-DD
    return Temporal.PlainDate.from(isoString);
  }

  /**
   * Convierte Date nativo a ZonedDateTime
   */
  static dateToZonedDateTime(date: Date, timeZone?: string): Temporal.ZonedDateTime {
    const tz = timeZone || temporalConfig.defaultTimeZone;
    return Temporal.ZonedDateTime.from({
      year: date.getFullYear(),
      month: date.getMonth() + 1,
      day: date.getDate(),
      hour: date.getHours(),
      minute: date.getMinutes(),
      second: date.getSeconds(),
      millisecond: date.getMilliseconds(),
      timeZone: tz,
    });
  }

  /**
   * Convierte PlainDate a Date nativo (medianoche UTC)
   */
  static plainDateToDate(plainDate: Temporal.PlainDate): Date {
    const isoString = `${plainDate.toString()}T00:00:00.000Z`;
    return new Date(isoString);
  }

  /**
   * Convierte ZonedDateTime a Date nativo
   */
  static zonedDateTimeToDate(zonedDateTime: Temporal.ZonedDateTime): Date {
    return new Date(zonedDateTime.toInstant().toString());
  }

  /**
   * Obtiene la fecha de hoy como PlainDate
   */
  static today(): Temporal.PlainDate {
    return Temporal.Now.plainDateISO(temporalConfig.defaultTimeZone);
  }

  /**
   * Obtiene la fecha y hora actual como ZonedDateTime
   */
  static now(): Temporal.ZonedDateTime {
    return Temporal.Now.zonedDateTimeISO(temporalConfig.defaultTimeZone);
  }

  /**
   * Parsea string ISO a PlainDate
   */
  static parsePlainDate(isoString: string): Temporal.PlainDate {
    // Acepta tanto "2025-12-14" como "2025-12-14T00:00:00.000Z"
    const dateOnly = isoString.split('T')[0];
    return Temporal.PlainDate.from(dateOnly);
  }

  /**
   * Calcula días entre dos fechas
   */
  static daysBetween(
    start: Temporal.PlainDate,
    end: Temporal.PlainDate
  ): number {
    return start.until(end).days;
  }

  /**
   * Suma días a una fecha
   */
  static addDays(
    date: Temporal.PlainDate,
    days: number
  ): Temporal.PlainDate {
    return date.add({ days });
  }

  /**
   * Compara dos fechas
   * @returns -1 si date1 < date2, 0 si son iguales, 1 si date1 > date2
   */
  static compareDates(
    date1: Temporal.PlainDate,
    date2: Temporal.PlainDate
  ): number {
    return Temporal.PlainDate.compare(date1, date2);
  }

  /**
   * Verifica si una fecha está en un rango (inclusive)
   */
  static isDateInRange(
    date: Temporal.PlainDate,
    start: Temporal.PlainDate,
    end: Temporal.PlainDate
  ): boolean {
    return (
      TemporalUtils.compareDates(date, start) >= 0 &&
      TemporalUtils.compareDates(date, end) <= 0
    );
  }

  /**
   * Genera array de fechas entre start y end (inclusive start, exclusive end)
   */
  static dateRange(
    start: Temporal.PlainDate,
    end: Temporal.PlainDate
  ): Temporal.PlainDate[] {
    const dates: Temporal.PlainDate[] = [];
    let current = start;
    
    while (TemporalUtils.compareDates(current, end) < 0) {
      dates.push(current);
      current = current.add({ days: 1 });
    }
    
    return dates;
  }

  /**
   * Formatea PlainDate a string YYYY-MM-DD
   */
  static formatDate(date: Temporal.PlainDate): string {
    return date.toString();
  }

  /**
   * Formatea PlainDate a string localizado (es-CO)
   */
  static formatDateLocalized(date: Temporal.PlainDate): string {
    // Temporal no tiene formato localizado nativo, usar conversión a Date
    const nativeDate = TemporalUtils.plainDateToDate(date);
    return nativeDate.toLocaleDateString('es-CO');
  }
}

