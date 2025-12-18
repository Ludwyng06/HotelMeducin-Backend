import { TemporalUtils } from './temporal.utils';
import { Temporal } from '@js-temporal/polyfill';

describe('TemporalUtils', () => {
  describe('dateToPlainDate', () => {
    it('debe convertir Date a PlainDate correctamente', () => {
      const date = new Date('2025-12-18T10:30:00Z');
      const plainDate = TemporalUtils.dateToPlainDate(date);
      
      expect(plainDate.year).toBe(2025);
      expect(plainDate.month).toBe(12);
      expect(plainDate.day).toBe(18);
    });
  });

  describe('plainDateToDate', () => {
    it('debe convertir PlainDate a Date correctamente', () => {
      const plainDate = Temporal.PlainDate.from('2025-12-18');
      const date = TemporalUtils.plainDateToDate(plainDate);
      
      expect(date).toBeInstanceOf(Date);
      expect(date.toISOString().split('T')[0]).toBe('2025-12-18');
    });
  });

  describe('today', () => {
    it('debe retornar la fecha de hoy como PlainDate', () => {
      const today = TemporalUtils.today();
      
      expect(today).toBeInstanceOf(Temporal.PlainDate);
      const todayDate = new Date();
      expect(today.year).toBe(todayDate.getFullYear());
      expect(today.month).toBe(todayDate.getMonth() + 1);
      expect(today.day).toBe(todayDate.getDate());
    });
  });

  describe('parsePlainDate', () => {
    it('debe parsear string ISO completo a PlainDate', () => {
      const date = TemporalUtils.parsePlainDate('2025-12-18T00:00:00.000Z');
      
      expect(date.year).toBe(2025);
      expect(date.month).toBe(12);
      expect(date.day).toBe(18);
    });

    it('debe parsear string de fecha simple a PlainDate', () => {
      const date = TemporalUtils.parsePlainDate('2025-12-18');
      
      expect(date.year).toBe(2025);
      expect(date.month).toBe(12);
      expect(date.day).toBe(18);
    });
  });

  describe('daysBetween', () => {
    it('debe calcular días entre fechas correctamente', () => {
      const start = Temporal.PlainDate.from('2025-12-14');
      const end = Temporal.PlainDate.from('2025-12-20');
      
      const days = TemporalUtils.daysBetween(start, end);
      expect(days).toBe(6);
    });

    it('debe retornar 0 si las fechas son iguales', () => {
      const date = Temporal.PlainDate.from('2025-12-18');
      const days = TemporalUtils.daysBetween(date, date);
      expect(days).toBe(0);
    });
  });

  describe('addDays', () => {
    it('debe sumar días correctamente', () => {
      const date = Temporal.PlainDate.from('2025-12-18');
      const futureDate = TemporalUtils.addDays(date, 7);
      
      expect(futureDate.year).toBe(2025);
      expect(futureDate.month).toBe(12);
      expect(futureDate.day).toBe(25);
    });
  });

  describe('compareDates', () => {
    it('debe retornar -1 si date1 < date2', () => {
      const date1 = Temporal.PlainDate.from('2025-12-14');
      const date2 = Temporal.PlainDate.from('2025-12-20');
      
      const comparison = TemporalUtils.compareDates(date1, date2);
      expect(comparison).toBe(-1);
    });

    it('debe retornar 0 si las fechas son iguales', () => {
      const date1 = Temporal.PlainDate.from('2025-12-18');
      const date2 = Temporal.PlainDate.from('2025-12-18');
      
      const comparison = TemporalUtils.compareDates(date1, date2);
      expect(comparison).toBe(0);
    });

    it('debe retornar 1 si date1 > date2', () => {
      const date1 = Temporal.PlainDate.from('2025-12-20');
      const date2 = Temporal.PlainDate.from('2025-12-14');
      
      const comparison = TemporalUtils.compareDates(date1, date2);
      expect(comparison).toBe(1);
    });
  });

  describe('isDateInRange', () => {
    it('debe retornar true si fecha está en rango', () => {
      const date = Temporal.PlainDate.from('2025-12-18');
      const start = Temporal.PlainDate.from('2025-12-14');
      const end = Temporal.PlainDate.from('2025-12-20');
      
      const inRange = TemporalUtils.isDateInRange(date, start, end);
      expect(inRange).toBe(true);
    });

    it('debe retornar true si fecha es igual al inicio', () => {
      const date = Temporal.PlainDate.from('2025-12-14');
      const start = Temporal.PlainDate.from('2025-12-14');
      const end = Temporal.PlainDate.from('2025-12-20');
      
      const inRange = TemporalUtils.isDateInRange(date, start, end);
      expect(inRange).toBe(true);
    });

    it('debe retornar true si fecha es igual al final', () => {
      const date = Temporal.PlainDate.from('2025-12-20');
      const start = Temporal.PlainDate.from('2025-12-14');
      const end = Temporal.PlainDate.from('2025-12-20');
      
      const inRange = TemporalUtils.isDateInRange(date, start, end);
      expect(inRange).toBe(true);
    });

    it('debe retornar false si fecha está fuera del rango', () => {
      const date = Temporal.PlainDate.from('2025-12-25');
      const start = Temporal.PlainDate.from('2025-12-14');
      const end = Temporal.PlainDate.from('2025-12-20');
      
      const inRange = TemporalUtils.isDateInRange(date, start, end);
      expect(inRange).toBe(false);
    });
  });

  describe('dateRange', () => {
    it('debe generar rango de fechas correctamente', () => {
      const start = Temporal.PlainDate.from('2025-12-14');
      const end = Temporal.PlainDate.from('2025-12-17');
      
      const range = TemporalUtils.dateRange(start, end);
      expect(range.length).toBe(3);
      expect(range[0].toString()).toBe('2025-12-14');
      expect(range[1].toString()).toBe('2025-12-15');
      expect(range[2].toString()).toBe('2025-12-16');
    });

    it('debe retornar array vacío si start >= end', () => {
      const start = Temporal.PlainDate.from('2025-12-18');
      const end = Temporal.PlainDate.from('2025-12-18');
      
      const range = TemporalUtils.dateRange(start, end);
      expect(range.length).toBe(0);
    });
  });

  describe('formatDate', () => {
    it('debe formatear fecha a string YYYY-MM-DD', () => {
      const date = Temporal.PlainDate.from('2025-12-18');
      const formatted = TemporalUtils.formatDate(date);
      
      expect(formatted).toBe('2025-12-18');
    });
  });

  describe('formatDateLocalized', () => {
    it('debe formatear fecha a string localizado', () => {
      const date = Temporal.PlainDate.from('2025-12-18');
      const formatted = TemporalUtils.formatDateLocalized(date);
      
      // Verificar que es un string y tiene formato de fecha
      expect(typeof formatted).toBe('string');
      expect(formatted.length).toBeGreaterThan(0);
      // Verificar que contiene el año
      expect(formatted).toContain('2025');
    });
  });
});
