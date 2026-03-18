export type StructuralValidationErrorCode =
  | 'missing_field'
  | 'invalid_format'
  | 'invalid_version'
  | 'field_too_large'
  | 'unknown_record_type';

export type StructuralValidationError = {
  valid: false;
  reason: StructuralValidationErrorCode;
  field?: string;
};

export type StructuralValidationResult = { valid: true } | StructuralValidationError;

export type StructuralRecord = Record<string, unknown>;
