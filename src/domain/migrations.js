/* ============================================================
   domain/migrations.js — Data migration system
   Handles version upgrades for IndexedDB data and backup imports
   ============================================================ */

import { SCHEMA_VERSIONS, validateEntity, AttemptSchema, QuestionSchema, GeneratedQuestionSchema, SettingsSchema, ErrorReportSchema } from './entities.js';

/**
 * Migration registry - maps entity types to their migration functions
 */
const MIGRATIONS = {
  attempt: {
    currentVersion: SCHEMA_VERSIONS.ATTEMPT,
    migrations: [
      // Future migrations will be added here
      // v1 -> v2: function(entity) { return upgradedEntity; }
    ],
  },
  question: {
    currentVersion: SCHEMA_VERSIONS.QUESTION,
    migrations: [
      // Future migrations will be added here
    ],
  },
  generatedQuestion: {
    currentVersion: SCHEMA_VERSIONS.GENERATED_QUESTION,
    migrations: [
      // Future migrations will be added here
    ],
  },
  settings: {
    currentVersion: SCHEMA_VERSIONS.SETTINGS,
    migrations: [
      // Future migrations will be added here
    ],
  },
  errorReport: {
    currentVersion: SCHEMA_VERSIONS.ERROR_REPORT,
    migrations: [
      // Future migrations will be added here
    ],
  },
};

/**
 * Migration runner for a single entity
 */
export function migrateEntity(entityType, entity, fromVersion) {
  const registry = MIGRATIONS[entityType];
  if (!registry) {
    console.warn(`No migration registry for entity type: ${entityType}`);
    return entity;
  }

  let current = entity;
  let currentVersion = fromVersion || 1;

  // Apply migrations sequentially
  while (currentVersion < registry.currentVersion) {
    const migrationFn = registry.migrations[currentVersion - 1];
    if (migrationFn) {
      try {
        current = migrationFn(current);
        currentVersion++;
      } catch (err) {
        console.error(`Migration failed for ${entityType} from v${currentVersion}:`, err);
        throw new Error(`Migration failed: ${err.message}`);
      }
    } else {
      // No migration defined for this version, skip
      currentVersion++;
    }
  }

  // Validate the migrated entity
  try {
    const schemaMap = {
      attempt: AttemptSchema,
      question: QuestionSchema,
      generatedQuestion: GeneratedQuestionSchema,
      settings: SettingsSchema,
      errorReport: ErrorReportSchema,
    };
    const schema = schemaMap[entityType];
    if (schema) {
      validateEntity(current, schema);
    }
  } catch (err) {
    console.error(`Validation failed after migration for ${entityType}:`, err);
    throw new Error(`Post-migration validation failed: ${err.message}`);
  }

  return current;
}

/**
 * Batch migration for arrays of entities
 */
export function migrateEntityArray(entityType, entities, fromVersion) {
  if (!Array.isArray(entities)) {
    return migrateEntity(entityType, entities, fromVersion);
  }

  return entities.map(entity => migrateEntity(entityType, entity, fromVersion));
}

/**
 * Backup payload migration
 * Handles version upgrades for imported backup files
 */
export function migrateBackupPayload(payload) {
  if (!payload || typeof payload !== 'object') {
    throw new Error('Invalid backup payload');
  }

  const version = payload.v || 1;
  let current = payload;

  // Backup format migrations
  if (version < 2) {
    // v1 -> v2 migration
    current = migrateBackupV1ToV2(current);
  }

  // Migrate nested entities
  if (Array.isArray(current.attempts)) {
    current.attempts = migrateEntityArray('attempt', current.attempts, 1);
  }

  if (Array.isArray(current.generatedQuestions)) {
    current.generatedQuestions = migrateEntityArray('generatedQuestion', current.generatedQuestions, 1);
  }

  if (Array.isArray(current.errorReports)) {
    current.errorReports = migrateEntityArray('errorReport', current.errorReports, 1);
  }

  if (current.settings) {
    current.settings = migrateEntity('settings', current.settings, 1);
  }

  // Update version
  current.v = SCHEMA_VERSIONS.BACKUP;

  return current;
}

/**
 * v1 -> v2 backup migration
 * Adds missing fields and normalizes structure
 */
function migrateBackupV1ToV2(payload) {
  const migrated = { ...payload };

  // Ensure settings object exists
  if (!migrated.settings) {
    migrated.settings = {};
  }

  // Set default values for new settings
  if (!migrated.settings.theme) migrated.settings.theme = 'dark';
  if (!migrated.settings.neuron_cap) migrated.settings.neuron_cap = 8000;
  if (!migrated.settings.cf_model) migrated.settings.cf_model = '@cf/meta/llama-3-8b-instruct';

  // Ensure arrays exist
  if (!Array.isArray(migrated.attempts)) migrated.attempts = [];
  if (!Array.isArray(migrated.generatedQuestions)) migrated.generatedQuestions = [];
  if (!Array.isArray(migrated.errorReports)) migrated.errorReports = [];

  // Add sourceCounts if missing
  if (!migrated.sourceCounts) {
    migrated.sourceCounts = {
      curatedQuestions: 0,
    };
  }

  return migrated;
}

/**
 * IndexedDB database migration
 * Called when opening the database with a higher version
 */
export function migrateDatabase(db, oldVersion, newVersion) {
  console.log(`Migrating database from v${oldVersion} to v${newVersion}`);

  // Version 1 -> 2 migration (current DB is at v2)
  if (oldVersion < 2) {
    // Create new object stores if they don't exist
    if (!db.objectStoreNames.contains('generated_questions')) {
      const store = db.createObjectStore('generated_questions', { keyPath: 'id' });
      store.createIndex('topic', 'topic', { unique: false });
    }
  }

  // Future migrations will be added here
  // if (oldVersion < 3) { ... }
}

/**
 * Get current schema version for an entity type
 */
export function getCurrentVersion(entityType) {
  const registry = MIGRATIONS[entityType];
  return registry ? registry.currentVersion : 1;
}

/**
 * Check if an entity needs migration
 */
export function needsMigration(entityType, entity) {
  const entityVersion = entity._version || 1;
  const currentVersion = getCurrentVersion(entityType);
  return entityVersion < currentVersion;
}