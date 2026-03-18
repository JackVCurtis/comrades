import { decodeDurableRecord } from '../decode-record';
import type { DurableRecord } from '../records';
import {
  type ValidationResult,
} from './ValidationResult';
import { safeValidationWrapper } from './safeValidationWrapper';
import { validateRecordStructure } from './validateRecordStructure';
import {
  type CryptographicValidationContext,
  validateRecordCryptography,
} from './validateRecordCryptography';
import {
  type SemanticValidationContext,
  validateRecordSemantics,
} from './validateRecordSemantics';

function validateCryptography(
  record: DurableRecord,
  context: CryptographicValidationContext
): ValidationResult {
  const cryptoResult = validateRecordCryptography(record, context);
  if (cryptoResult.valid) {
    return {
      status: 'accepted',
      reason: 'cryptographic_validation_passed',
      details: {
        source: 'record_validation',
      },
    };
  }

  return {
    status: 'rejected',
    phase: 'cryptographic',
    reason: cryptoResult.reason,
    field: cryptoResult.field,
    details: {
      source: 'record_validation',
    },
  };
}

export type RecordValidationContext = CryptographicValidationContext & {
  semantic?: SemanticValidationContext;
};

export function validateRecord(
  record: unknown,
  context: RecordValidationContext = {}
): ValidationResult {
  return safeValidationWrapper(() => {
    const structureResult = validateRecordStructure(record);
    if (!structureResult.valid) {
      return {
        status: 'rejected',
        phase: 'structural',
        reason: structureResult.reason,
        field: structureResult.field,
        details: {
          source: 'record_validation',
        },
      };
    }

    const decoded = decodeDurableRecord(record);
    if (!decoded.ok) {
      return {
        status: 'rejected',
        phase: 'structural',
        reason: decoded.code,
        details: {
          source: 'record_validation',
        },
      };
    }

    const cryptographicResult = validateCryptography(decoded.record, context);
    if (cryptographicResult.status !== 'accepted') {
      return cryptographicResult;
    }

    const semanticResult = validateRecordSemantics(decoded.record, context.semantic);
    if (semanticResult.result !== 'accepted') {
      return {
        status: semanticResult.result,
        phase: 'semantic',
        reason: semanticResult.reason,
        details: {
          source: 'record_validation',
        },
      };
    }

    return {
      status: 'accepted',
      reason: 'validation_passed',
      details: {
        source: 'record_validation',
      },
    };
  });
}

