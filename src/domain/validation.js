/* ============================================================
   domain/validation.js — Runtime validation utilities
   Used at repository boundaries to ensure data integrity
   ============================================================ */

import { validateEntity, isQuestion, isAttempt, isSettings, QuestionSchema, AttemptSchema, SettingsSchema, GeneratedQuestionSchema, ErrorReportSchema } from './entities.js';

/**
 * Validation result wrapper
 */
export class ValidationResult {
  constructor(success, errors = [], data = null) {
    this.success = success;
    this.errors = errors;
    this.data = data;
  }

  static ok(data) {
    return new ValidationResult(true, [], data);
  }

  static fail(errors) {
    return new ValidationResult(false, Array.isArray(errors) ? errors : [errors]);
  }

  unwrap() {
    if (!this.success) {
      throw new Error(`Validation failed: ${this.errors.join(', ')}`);
    }
    return this.data;
  }
}

/**
 * Repository boundary validator
 * Validates data entering or leaving repositories
 */
export class RepositoryValidator {
  constructor(entityType, schema) {
    this.entityType = entityType;
    this.schema = schema;
  }

  /**
   * Validate data before writing to repository
   */
  validateWrite(data) {
    try {
      if (Array.isArray(data)) {
        data.forEach(item => validateEntity(item, this.schema));
      } else {
        validateEntity(data, this.schema);
      }
      return ValidationResult.ok(data);
    } catch (err) {
      return ValidationResult.fail([`Write validation failed for ${this.entityType}: ${err.message}`]);
    }
  }

  /**
   * Validate data after reading from repository
   */
  validateRead(data) {
    try {
      if (Array.isArray(data)) {
        data.forEach(item => validateEntity(item, this.schema));
      } else if (data !== null && data !== undefined) {
        validateEntity(data, this.schema);
      }
      return ValidationResult.ok(data);
    } catch (err) {
      return ValidationResult.fail([`Read validation failed for ${this.entityType}: ${err.message}`]);
    }
  }

  /**
   * Sanitize data by removing unknown fields
   */
  sanitize(data) {
    const knownFields = Object.keys(this.schema.shape);
    
    if (Array.isArray(data)) {
      return data.map(item => this.sanitizeItem(item, knownFields));
    } else {
      return this.sanitizeItem(data, knownFields);
    }
  }

  sanitizeItem(item, knownFields) {
    if (!item || typeof item !== 'object') return item;
    
    const sanitized = {};
    for (const field of knownFields) {
      if (item[field] !== undefined) {
        sanitized[field] = item[field];
      }
    }
    return sanitized;
  }
}

/**
 * Pre-configured validators for each entity type
 */
export const validators = {
  question: new RepositoryValidator('question', QuestionSchema),
  attempt: new RepositoryValidator('attempt', AttemptSchema),
  settings: new RepositoryValidator('settings', SettingsSchema),
  generatedQuestion: new RepositoryValidator('generatedQuestion', GeneratedQuestionSchema),
  errorReport: new RepositoryValidator('errorReport', ErrorReportSchema),
};

/**
 * Decorator function to add validation to repository methods
 * Note: JavaScript decorators are not fully supported in all environments,
 * so this is a higher-order function instead
 */
export function withValidation(validator, operation = 'write') {
  return function(originalMethod) {
    return async function(...args) {
      const data = args[0]; // Assume first argument is the data to validate
      
      const validationResult = operation === 'write' 
        ? validator.validateWrite(data)
        : validator.validateRead(data);

      if (!validationResult.success) {
        console.error(`Validation error:`, validationResult.errors);
        throw new Error(validationResult.errors[0]);
      }

      // Replace with sanitized data
      args[0] = validator.sanitize(validationResult.data);
      
      return originalMethod.apply(this, args);
    };
  };
}

/**
 * Bulk validation for arrays
 */
export function validateBulk(data, validator) {
  if (!Array.isArray(data)) {
    return validator.validateWrite(data);
  }

  const errors = [];
  const valid = [];

  data.forEach((item, index) => {
    try {
      validator.validateWrite(item);
      valid.push(item);
    } catch (err) {
      errors.push(`Item ${index}: ${err.message}`);
    }
  });

  if (errors.length > 0) {
    return ValidationResult.fail(errors);
  }

  return ValidationResult.ok(valid);
}

/**
 * Partial validation for updates (allows missing fields)
 */
export function validatePartial(data, schema) {
  if (!data || typeof data !== 'object') {
    throw new Error('Partial data must be an object');
  }

  const errors = [];
  for (const [key, value] of Object.entries(data)) {
    const expectedType = schema.shape[key];
    if (!expectedType) {
      // Allow unknown fields in partial updates (they might be metadata)
      continue;
    }

    const isOptional = expectedType.endsWith('?');
    const baseType = isOptional ? expectedType.slice(0, -1) : expectedType;
    const actualType = Array.isArray(value) ? 'array' : typeof value;

    if (actualType !== baseType) {
      errors.push(`Field ${key}: expected ${baseType}, got ${actualType}`);
    }
  }

  if (errors.length > 0) {
    throw new Error(`Partial validation failed: ${errors.join(', ')}`);
  }

  return true;
}

/**
 * Import payload validation
 * Validates backup import payloads
 */
export function validateImportPayload(payload) {
  if (!payload || typeof payload !== 'object') {
    throw new Error('Import payload must be an object');
  }

  const errors = [];

  // Check version
  if (typeof payload.v !== 'number') {
    errors.push('Missing or invalid version field');
  }

  // Check required top-level fields
  const requiredFields = ['exportedAt', 'attempts', 'settings'];
  for (const field of requiredFields) {
    if (!(field in payload)) {
      errors.push(`Missing required field: ${field}`);
    }
  }

  // Validate arrays
  if (payload.attempts && !Array.isArray(payload.attempts)) {
    errors.push('attempts must be an array');
  }

  if (payload.generatedQuestions && !Array.isArray(payload.generatedQuestions)) {
    errors.push('generatedQuestions must be an array');
  }

  if (payload.errorReports && !Array.isArray(payload.errorReports)) {
    errors.push('errorReports must be an array');
  }

  if (errors.length > 0) {
    throw new Error(`Import payload validation failed: ${errors.join(', ')}`);
  }

  return true;
}

/**
 * Validate and migrate backup payload
 * Combines validation with migration for import workflows
 */
export function validateAndMigrateBackup(payload) {
  // First validate structure
  validateImportPayload(payload);
  
  // Then migrate to current version
  // Note: This is a synchronous wrapper - actual migration should be called separately
  return payload;
}