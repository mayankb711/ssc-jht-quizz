/* ============================================================
   infrastructure/repositories/interfaces.js — Repository interfaces
   Defines contracts for data access, abstracting storage implementation
   ============================================================ */

/**
 * Question Repository Interface
 * Handles read-only access to question content
 */
export class IQuestionRepository {
  /**
   * Get a question by ID
   * @param {string} id - Question ID
   * @returns {Promise<Object|null>} Question entity or null
   */
  async getById(id) {
    throw new Error('Not implemented');
  }

  /**
   * Get all questions
   * @returns {Promise<Array>} Array of question entities
   */
  async getAll() {
    throw new Error('Not implemented');
  }

  /**
   * Get questions by topic
   * @param {string} topicId - Topic ID
   * @returns {Promise<Array>} Array of question entities
   */
  async getByTopic(topicId) {
    throw new Error('Not implemented');
  }

  /**
   * Get questions by subject
   * @param {string} subject - Subject ('hi' | 'en')
   * @returns {Promise<Array>} Array of question entities
   */
  async getBySubject(subject) {
    throw new Error('Not implemented');
  }

  /**
   * Search questions by text
   * @param {string} query - Search query
   * @returns {Promise<Array>} Array of matching question entities
   */
  async search(query) {
    throw new Error('Not implemented');
  }
}

/**
 * Attempt Repository Interface
 * Handles learner attempt data (mutable)
 */
export class IAttemptRepository {
  /**
   * Add a new attempt
   * @param {Object} attempt - Attempt entity
   * @returns {Promise<Object>} Saved attempt entity
   */
  async add(attempt) {
    throw new Error('Not implemented');
  }

  /**
   * Get all attempts
   * @returns {Promise<Array>} Array of attempt entities
   */
  async getAll() {
    throw new Error('Not implemented');
  }

  /**
   * Get attempts by question ID
   * @param {string} questionId - Question ID
   * @returns {Promise<Array>} Array of attempt entities
   */
  async getByQuestion(questionId) {
    throw new Error('Not implemented');
  }

  /**
   * Get attempts by topic
   * @param {string} topicId - Topic ID
   * @returns {Promise<Array>} Array of attempt entities
   */
  async getByTopic(topicId) {
    throw new Error('Not implemented');
  }

  /**
   * Replace all attempts (for import)
   * @param {Array} attempts - Array of attempt entities
   * @returns {Promise<void>}
   */
  async replaceAll(attempts) {
    throw new Error('Not implemented');
  }

  /**
   * Delete attempts older than a timestamp
   * @param {number} timestamp - Unix timestamp
   * @returns {Promise<number>} Number of deleted attempts
   */
  async deleteOlderThan(timestamp) {
    throw new Error('Not implemented');
  }
}

/**
 * Settings Repository Interface
 * Handles user preferences and configuration
 */
export class ISettingsRepository {
  /**
   * Get a setting value
   * @param {string} key - Setting key
   * @param {*} defaultValue - Default value if not found
   * @returns {Promise<*>} Setting value
   */
  async get(key, defaultValue) {
    throw new Error('Not implemented');
  }

  /**
   * Set a setting value
   * @param {string} key - Setting key
   * @param {*} value - Setting value
   * @returns {Promise<*>} Saved value
   */
  async set(key, value) {
    throw new Error('Not implemented');
  }

  /**
   * Get all settings
   * @returns {Promise<Object>} All settings as object
   */
  async getAll() {
    throw new Error('Not implemented');
  }

  /**
   * Set multiple settings at once
   * @param {Object} settings - Settings object
   * @returns {Promise<void>}
   */
  async setMany(settings) {
    throw new Error('Not implemented');
  }

  /**
   * Delete a setting
   * @param {string} key - Setting key
   * @returns {Promise<void>}
   */
  async delete(key) {
    throw new Error('Not implemented');
  }
}

/**
 * Generated Question Repository Interface
 * Handles AI-generated questions
 */
export class IGeneratedQuestionRepository {
  /**
   * Add or update a generated question
   * @param {Object} question - Generated question entity
   * @returns {Promise<Object>} Saved question entity
   */
  async upsert(question) {
    throw new Error('Not implemented');
  }

  /**
   * Get a generated question by ID
   * @param {string} id - Question ID
   * @returns {Promise<Object|null>} Question entity or null
   */
  async getById(id) {
    throw new Error('Not implemented');
  }

  /**
   * Get all generated questions
   * @returns {Promise<Array>} Array of generated question entities
   */
  async getAll() {
    throw new Error('Not implemented');
  }

  /**
   * Get accepted generated questions
   * @returns {Promise<Array>} Array of accepted question entities
   */
  async getAccepted() {
    throw new Error('Not implemented');
  }

  /**
   * Delete a generated question
   * @param {string} id - Question ID
   * @returns {Promise<void>}
   */
  async delete(id) {
    throw new Error('Not implemented');
  }
}

/**
 * Diagnostics Repository Interface
 * Handles error reports and diagnostic data
 */
export class IDiagnosticsRepository {
  /**
   * Log an error report
   * @param {Object} report - Error report entity
   * @returns {Promise<Object>} Saved report entity
   */
  async logError(report) {
    throw new Error('Not implemented');
  }

  /**
   * Get all error reports
   * @returns {Promise<Array>} Array of error report entities
   */
  async getAllReports() {
    throw new Error('Not implemented');
  }

  /**
   * Get unresolved error reports
   * @returns {Promise<Array>} Array of unresolved error report entities
   */
  async getUnresolved() {
    throw new Error('Not implemented');
  }

  /**
   * Mark a report as resolved
   * @param {string} reportId - Report ID
   * @param {boolean} resolved - Resolved status
   * @returns {Promise<void>}
   */
  async markResolved(reportId, resolved) {
    throw new Error('Not implemented');
  }

  /**
   * Append a recovery step to a report
   * @param {string} reportId - Report ID
   * @param {string} step - Recovery step description
   * @returns {Promise<void>}
   */
  async appendRecoveryStep(reportId, step) {
    throw new Error('Not implemented');
  }

  /**
   * Clear all error reports
   * @returns {Promise<void>}
   */
  async clearAll() {
    throw new Error('Not implemented');
  }
}

/**
 * Cache Repository Interface
 * Handles generic key-value caching
 */
export class ICacheRepository {
  /**
   * Get a cached value
   * @param {string} key - Cache key
   * @returns {Promise<*>} Cached value or null
   */
  async get(key) {
    throw new Error('Not implemented');
  }

  /**
   * Set a cached value
   * @param {string} key - Cache key
   * @param {*} value - Value to cache
   * @returns {Promise<*>} Saved value
   */
  async set(key, value) {
    throw new Error('Not implemented');
  }

  /**
   * Delete a cached value
   * @param {string} key - Cache key
   * @returns {Promise<void>}
   */
  async delete(key) {
    throw new Error('Not implemented');
  }

  /**
   * Clear all cache entries
   * @returns {Promise<void>}
   */
  async clear() {
    throw new Error('Not implemented');
  }
}

/**
 * Backup Repository Interface
 * Handles backup export/import operations
 */
export class IBackupRepository {
  /**
   * Export current state as backup payload
   * @returns {Promise<Object>} Backup payload
   */
  async export() {
    throw new Error('Not implemented');
  }

  /**
   * Import a backup payload
   * @param {Object} payload - Backup payload
   * @returns {Promise<Object>} Import summary
   */
  async import(payload) {
    throw new Error('Not implemented');
  }

  /**
   * Get backup metadata
   * @returns {Promise<Object>} Backup metadata
   */
  async getMetadata() {
    throw new Error('Not implemented');
  }
}