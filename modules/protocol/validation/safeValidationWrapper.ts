import {
  type ValidationResult,
  VALIDATION_FAILURE_REASON,
  rejectedValidationFailure,
} from './ValidationResult';

const VALID_STATUSES = new Set(['accepted', 'rejected', 'conflicted']);

function isValidationResult(result: unknown): result is ValidationResult {
  if (!result || typeof result !== 'object') {
    return false;
  }

  const candidate = result as Partial<ValidationResult>;
  return (
    typeof candidate.reason === 'string' &&
    typeof candidate.status === 'string' &&
    VALID_STATUSES.has(candidate.status)
  );
}

export function safeValidationWrapper(runValidation: () => ValidationResult): ValidationResult {
  try {
    const result = runValidation();

    if (!isValidationResult(result)) {
      return rejectedValidationFailure();
    }

    return result;
  } catch {
    return {
      status: 'rejected',
      reason: VALIDATION_FAILURE_REASON,
      details: {
        source: 'record_validation',
      },
    };
  }
}
