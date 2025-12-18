import { Prop } from '@nestjs/mongoose';
import '@js-temporal/polyfill';
import { Temporal } from '@js-temporal/polyfill';
import { TemporalUtils } from '../utils/temporal.utils';

/**
 * Transformador para campos de fecha en Mongoose
 * Convierte automáticamente entre Date y PlainDate
 */
export const TemporalDateTransform = {
  get: (value: Date | string | null): Temporal.PlainDate | null => {
    if (!value) return null;
    if (value instanceof Date) {
      return TemporalUtils.dateToPlainDate(value);
    }
    if (typeof value === 'string') {
      return TemporalUtils.parsePlainDate(value);
    }
    return null;
  },
  set: (value: Temporal.PlainDate | Date | string): Date => {
    if (value instanceof Temporal.PlainDate) {
      return TemporalUtils.plainDateToDate(value);
    }
    if (value instanceof Date) {
      return value;
    }
    if (typeof value === 'string') {
      return new Date(value);
    }
    return new Date();
  },
};

/**
 * Decorador para campos de fecha con Temporal
 * Uso: @TemporalDateProp()
 */
export function TemporalDateProp(options?: any) {
  return Prop({
    type: Date,
    ...options,
    get: TemporalDateTransform.get,
    set: TemporalDateTransform.set,
  });
}

