import { VALIDATION_LIMITS } from '../validationLimits';
import type {
  StructuralRecord,
  StructuralValidationError,
  StructuralValidationErrorCode,
} from '../validationTypes';

export function invalid(reason: StructuralValidationErrorCode, field?: string): StructuralValidationError {
  return field ? { valid: false, reason, field } : { valid: false, reason };
}

export function requireFields(record: StructuralRecord, fields: readonly string[]): StructuralValidationError | null {
  for (const field of fields) {
    if (!Object.prototype.hasOwnProperty.call(record, field) || record[field] === undefined || record[field] === null) {
      return invalid('missing_field', field);
    }
  }

  return null;
}

export function enforceStringMaxSize(value: unknown, field: string, max = VALIDATION_LIMITS.max_string_length): StructuralValidationError | null {
  if (typeof value !== 'string') {
    return invalid('invalid_format', field);
  }

  if (value.length > max) {
    return invalid('field_too_large', field);
  }

  return null;
}

export function enforceObject(value: unknown, field: string): StructuralValidationError | null {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return invalid('invalid_format', field);
  }

  return null;
}
