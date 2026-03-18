export type ValidationStatus = 'accepted' | 'rejected' | 'conflicted';

export type ValidationPhase = 'structural' | 'cryptographic' | 'semantic';

export interface ValidationResult {
  status: ValidationStatus;
  reason: string;
  phase?: ValidationPhase;
  field?: string;
  details?: unknown;
}

export const VALIDATION_FAILURE_REASON = 'validation_failure';

export function rejectedValidationFailure(): ValidationResult {
  return {
    status: 'rejected',
    reason: VALIDATION_FAILURE_REASON,
    details: {
      source: 'record_validation',
    },
  };
}
