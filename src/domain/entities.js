/* ============================================================
   domain/entities.js — Core domain entities with versioning
   Defines the shape of all domain objects with version numbers
   for backward compatibility and migrations.
   ============================================================ */

/**
 * Current schema versions - increment when entity structure changes
 */
export const SCHEMA_VERSIONS = {
  QUESTION: 1,
  ATTEMPT: 1,
  SETTINGS: 1,
  GENERATED_QUESTION: 1,
  BACKUP: 2, // Already at v2 in existing code
  ERROR_REPORT: 1,
  MASTERY: 1,
};

/**
 * Question Entity
 * Immutable question content (authored or AI-generated)
 */
export const QuestionSchema = {
  version: SCHEMA_VERSIONS.QUESTION,
  shape: {
    id: 'string',           // stable unique identifier
    topic: 'string',        // topic ID from topics.js
    skill: 'string?',       // optional skill within topic
    difficulty: 'number',   // 1-5 calibrated difficulty
    passage: 'string?',     // optional shared passage text
    stem: 'string',         // question text
    options: 'array',       // array of 4 strings
    answer: 'number',       // 0-3 index of correct option
    explain: 'string?',     // optional explanation
    source: 'string',       // 'PYQ-YYYY-MM-DD' | 'AUTHORED' | 'AI-GENERATED'
    lang: 'string',        // 'hi' | 'en'
    metadata: 'object?',    // optional AI metadata, generation params, etc.
  },
};

/**
 * Attempt Entity
 * Records a learner's response to a question
 */
export const AttemptSchema = {
  version: SCHEMA_VERSIONS.ATTEMPT,
  shape: {
    id: 'string',           // unique attempt ID
    question_id: 'string', // reference to Question.id
    topic: 'string',        // denormalized for performance
    skill: 'string?',       // optional skill
    selected: 'number?',    // 0-3 index of selected option (null if skipped)
    correct: 'boolean',     // whether the answer was correct
    ts: 'number',           // timestamp
    mode: 'string',         // 'mock' | 'quick' | 'topic' | 'mistakes'
    confidence: 'number?',  // optional confidence score 0-1
    time_spent: 'number?',  // optional time in milliseconds
  },
};

/**
 * Settings Entity
 * User preferences and configuration
 */
export const SettingsSchema = {
  version: SCHEMA_VERSIONS.SETTINGS,
  shape: {
    theme: 'string',        // 'dark' | 'light' | 'amoled' | 'eye' | 'contrast'
    cf_account: 'string?',  // Cloudflare account ID
    cf_token: 'string?',    // Cloudflare API token
    cf_model: 'string',     // AI model identifier
    neuron_cap: 'number',   // Daily AI usage cap
    sb_url: 'string?',      // Supabase project URL
    sb_key: 'string?',      // Supabase anon key
  },
};

/**
 * Generated Question Entity
 * AI-generated questions with additional metadata
 */
export const GeneratedQuestionSchema = {
  version: SCHEMA_VERSIONS.GENERATED_QUESTION,
  shape: {
    ...QuestionSchema.shape,
    generated_at: 'number',      // timestamp when generated
    generation_params: 'object?', // AI generation parameters
    quality_score: 'number?',    // optional quality score 0-1
    accepted: 'boolean',         // whether user accepted this question
  },
};

/**
 * Backup Entity
 * Complete backup payload for export/import
 */
export const BackupSchema = {
  version: SCHEMA_VERSIONS.BACKUP,
  shape: {
    v: 'number',                 // backup format version
    exportedAt: 'string',        // ISO timestamp
    attempts: 'array',           // array of Attempt entities
    generatedQuestions: 'array', // array of GeneratedQuestion entities
    errorReports: 'array',       // array of ErrorReport entities
    settings: 'object',          // Settings entity
    sourceCounts: 'object',      // metadata about source question counts
  },
};

/**
 * Error Report Entity
 * Diagnostic and error information
 */
export const ErrorReportSchema = {
  version: SCHEMA_VERSIONS.ERROR_REPORT,
  shape: {
    id: 'string',           // unique report ID
    ts: 'number',           // timestamp
    title: 'string',        // error title
    message: 'string',      // error message
    stack: 'string?',       // stack trace
    url: 'string',          // URL where error occurred
    screen: 'string',       // app screen where error occurred
    recoverySteps: 'array', // array of recovery step strings
    resolved: 'boolean',    // whether marked as resolved
  },
};

/**
 * Mastery Entity
 * Computed mastery metrics per topic/skill
 */
export const MasterySchema = {
  version: SCHEMA_VERSIONS.MASTERY,
  shape: {
    topic: 'string',        // topic ID
    skill: 'string?',       // optional skill
    mastery: 'number',      // 0-1 mastery score
    total: 'number',        // total attempts
    correct: 'number',      // correct attempts
    lastUpdated: 'number',  // timestamp
  },
};

/**
 * Validation helpers
 */
export function validateEntity(entity, schema) {
  if (!entity || typeof entity !== 'object') {
    throw new Error('Entity must be an object');
  }

  const errors = [];
  for (const [key, expectedType] of Object.entries(schema.shape)) {
    const value = entity[key];
    const actualType = Array.isArray(value) ? 'array' : typeof value;

    // Handle optional fields (marked with '?')
    const isOptional = expectedType.endsWith('?');
    const baseType = isOptional ? expectedType.slice(0, -1) : expectedType;

    if (value === undefined || value === null) {
      if (!isOptional) {
        errors.push(`Missing required field: ${key}`);
      }
    } else if (actualType !== baseType) {
      errors.push(`Field ${key}: expected ${baseType}, got ${actualType}`);
    }
  }

  if (errors.length > 0) {
    throw new Error(`Validation failed: ${errors.join(', ')}`);
  }

  return true;
}

/**
 * Type guards for runtime checking
 */
export function isQuestion(entity) {
  try {
    validateEntity(entity, QuestionSchema);
    return true;
  } catch {
    return false;
  }
}

export function isAttempt(entity) {
  try {
    validateEntity(entity, AttemptSchema);
    return true;
  } catch {
    return false;
  }
}

export function isSettings(entity) {
  try {
    validateEntity(entity, SettingsSchema);
    return true;
  } catch {
    return false;
  }
}