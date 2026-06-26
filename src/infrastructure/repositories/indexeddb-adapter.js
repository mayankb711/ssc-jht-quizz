/* ============================================================
   infrastructure/repositories/indexeddb-adapter.js — IndexedDB repository implementations
 * Wraps existing IndexedDB storage with repository interfaces
 * ============================================================ */

import { 
  IQuestionRepository, 
  IAttemptRepository, 
  ISettingsRepository, 
  IGeneratedQuestionRepository, 
  IDiagnosticsRepository, 
  ICacheRepository 
} from './interfaces.js';
import { validators, withValidation } from '../../domain/validation.js';
import { migrateEntity, migrateEntityArray } from '../../domain/migrations.js';
import { QUESTIONS } from '../../data/questions.js';

/**
 * IndexedDB Question Repository
 * Reads from both static QUESTIONS and generated questions
 */
export class IndexedDBQuestionRepository extends IQuestionRepository {
  constructor(generatedQuestionRepo) {
    super();
    this.generatedQuestionRepo = generatedQuestionRepo;
  }

  async getById(id) {
    // Check static questions first
    const staticQuestion = QUESTIONS.find(q => q.id === id);
    if (staticQuestion) {
      return staticQuestion;
    }

    // Check generated questions
    return await this.generatedQuestionRepo.getById(id);
  }

  async getAll() {
    const generated = await this.generatedQuestionRepo.getAll();
    return [...QUESTIONS, ...generated];
  }

  async getByTopic(topicId) {
    const staticQuestions = QUESTIONS.filter(q => q.topic === topicId);
    const allGenerated = await this.generatedQuestionRepo.getAll();
    const generated = allGenerated.filter(q => q.topic === topicId);
    return [...staticQuestions, ...generated];
  }

  async getBySubject(subject) {
    const { TOPICS } = await import('../../data/topics.js');
    const topicIds = TOPICS.filter(t => t.subject === subject).map(t => t.id);
    
    const staticQuestions = QUESTIONS.filter(q => topicIds.includes(q.topic));
    const allGenerated = await this.generatedQuestionRepo.getAll();
    const generated = allGenerated.filter(q => topicIds.includes(q.topic));
    return [...staticQuestions, ...generated];
  }

  async search(query) {
    const lowerQuery = query.toLowerCase();
    const allQuestions = await this.getAll();
    return allQuestions.filter(q => 
      q.stem.toLowerCase().includes(lowerQuery) ||
      q.options.some(o => o.toLowerCase().includes(lowerQuery))
    );
  }
}

/**
 * IndexedDB Attempt Repository
 */
export class IndexedDBAttemptRepository extends IAttemptRepository {
  constructor() {
    super();
    this.validator = validators.attempt;
  }

  async _getStore(mode) {
    const { tx } = await import('../../store/local.js');
    return tx('attempts', mode);
  }

  async add(attempt) {
    const validated = this.validator.validateWrite(attempt).unwrap();
    
    // Apply migration if needed
    const migrated = migrateEntity('attempt', validated, attempt._version || 1);
    
    const { addAttempt } = await import('../../store/local.js');
    return await addAttempt(migrated);
  }

  async getAll() {
    const { allAttempts } = await import('../../store/local.js');
    const attempts = await allAttempts();
    
    // Validate and migrate each attempt
    const validated = this.validator.validateRead(attempts).unwrap();
    return migrateEntityArray('attempt', validated, 1);
  }

  async getByQuestion(questionId) {
    const all = await this.getAll();
    return all.filter(a => a.question_id === questionId);
  }

  async getByTopic(topicId) {
    const all = await this.getAll();
    return all.filter(a => a.topic === topicId);
  }

  async replaceAll(attempts) {
    const validated = this.validator.validateWrite(attempts).unwrap();
    const migrated = migrateEntityArray('attempt', validated, 1);
    
    const { replaceAttempts } = await import('../../store/local.js');
    await replaceAttempts(migrated);
  }

  async deleteOlderThan(timestamp) {
    const all = await this.getAll();
    const toKeep = all.filter(a => a.ts >= timestamp);
    await this.replaceAll(toKeep);
    return all.length - toKeep.length;
  }
}

/**
 * IndexedDB Settings Repository
 */
export class IndexedDBSettingsRepository extends ISettingsRepository {
  constructor() {
    super();
    this.validator = validators.settings;
  }

  async get(key, defaultValue) {
    const { kvGet } = await import('../../store/local.js');
    const value = await kvGet(key, defaultValue);
    
    // Validate if it's a complex object
    if (value && typeof value === 'object') {
      try {
        this.validator.validateRead(value);
      } catch (err) {
        console.warn(`Settings validation failed for key ${key}:`, err);
        return defaultValue;
      }
    }
    
    return value;
  }

  async set(key, value) {
    // Validate if it's a complex object
    if (value && typeof value === 'object') {
      const validated = this.validator.validateWrite(value).unwrap();
      const migrated = migrateEntity('settings', validated, value._version || 1);
      
      const { kvSet } = await import('../../store/local.js');
      return await kvSet(key, migrated);
    }
    
    const { kvSet } = await import('../../store/local.js');
    return await kvSet(key, value);
  }

  async getAll() {
    const settings = {
      theme: await this.get('theme', 'dark'),
      cf_account: await this.get('cf_account', ''),
      cf_token: await this.get('cf_token', ''),
      cf_model: await this.get('cf_model', '@cf/meta/llama-3-8b-instruct'),
      neuron_cap: await this.get('neuron_cap', 8000),
      sb_url: await this.get('sb_url', ''),
      sb_key: await this.get('sb_key', ''),
    };
    
    return this.validator.validateRead(settings).unwrap();
  }

  async setMany(settings) {
    const validated = this.validator.validateWrite(settings).unwrap();
    const migrated = migrateEntity('settings', validated, settings._version || 1);
    
    for (const [key, value] of Object.entries(migrated)) {
      await this.set(key, value);
    }
  }

  async delete(key) {
    const { kvSet } = await import('../../store/local.js');
    await kvSet(key, null);
  }
}

/**
 * IndexedDB Generated Question Repository
 */
export class IndexedDBGeneratedQuestionRepository extends IGeneratedQuestionRepository {
  constructor() {
    super();
    this.validator = validators.generatedQuestion;
  }

  async _getStore(mode) {
    const { tx } = await import('../../store/local.js');
    return tx('generated_questions', mode);
  }

  async upsert(question) {
    const validated = this.validator.validateWrite(question).unwrap();
    const migrated = migrateEntity('generatedQuestion', validated, question._version || 1);
    
    const { upsertGeneratedQuestion } = await import('../../store/local.js');
    return await upsertGeneratedQuestion(migrated);
  }

  async getById(id) {
    const { getGeneratedQuestion } = await import('../../store/local.js');
    const question = await getGeneratedQuestion(id);
    
    if (!question) return null;
    
    const validated = this.validator.validateRead(question).unwrap();
    return migrateEntity('generatedQuestion', validated, question._version || 1);
  }

  async getAll() {
    const { allGeneratedQuestions } = await import('../../store/local.js');
    const questions = await allGeneratedQuestions();
    
    const validated = this.validator.validateRead(questions).unwrap();
    return migrateEntityArray('generatedQuestion', validated, 1);
  }

  async getAccepted() {
    const all = await this.getAll();
    return all.filter(q => q.accepted);
  }

  async delete(id) {
    const store = await this._getStore('readwrite');
    return new Promise((resolve, reject) => {
      const request = store.delete(id);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }
}

/**
 * IndexedDB Diagnostics Repository
 */
export class IndexedDBDiagnosticsRepository extends IDiagnosticsRepository {
  constructor() {
    super();
    this.validator = validators.errorReport;
  }

  async logError(report) {
    const validated = this.validator.validateWrite(report).unwrap();
    const migrated = migrateEntity('errorReport', validated, report._version || 1);
    
    const { logError } = await import('../../core/diagnostics.js');
    return await logError(migrated);
  }

  async getAllReports() {
    const { getReports } = await import('../../core/diagnostics.js');
    const reports = await getReports();
    
    const validated = this.validator.validateRead(reports).unwrap();
    return migrateEntityArray('errorReport', validated, 1);
  }

  async getUnresolved() {
    const all = await this.getAllReports();
    return all.filter(r => !r.resolved);
  }

  async markResolved(reportId, resolved) {
    const { markResolved } = await import('../../core/diagnostics.js');
    await markResolved(reportId, resolved);
  }

  async appendRecoveryStep(reportId, step) {
    const { appendRecovery } = await import('../../core/diagnostics.js');
    await appendRecovery(reportId, step);
  }

  async clearAll() {
    const { clearReports } = await import('../../core/diagnostics.js');
    await clearReports();
  }
}

/**
 * IndexedDB Cache Repository
 */
export class IndexedDBCacheRepository extends ICacheRepository {
  constructor() {
    super();
  }

  async get(key) {
    const { cacheGet } = await import('../../store/local.js');
    return await cacheGet(key);
  }

  async set(key, value) {
    const { cacheSet } = await import('../../store/local.js');
    return await cacheSet(key, value);
  }

  async delete(key) {
    const store = await this._getStore('readwrite');
    return new Promise((resolve, reject) => {
      const request = store.delete(key);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async _getStore(mode) {
    const { tx } = await import('../../store/local.js');
    return tx('cache', mode);
  }

  async clear() {
    const store = await this._getStore('readwrite');
    return new Promise((resolve, reject) => {
      const request = store.clear();
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }
}

/**
 * Repository factory
 * Creates repository instances with proper dependencies
 */
export function createRepositories() {
  const generatedQuestionRepo = new IndexedDBGeneratedQuestionRepository();
  const questionRepo = new IndexedDBQuestionRepository(generatedQuestionRepo);
  const attemptRepo = new IndexedDBAttemptRepository();
  const settingsRepo = new IndexedDBSettingsRepository();
  const diagnosticsRepo = new IndexedDBDiagnosticsRepository();
  const cacheRepo = new IndexedDBCacheRepository();

  return {
    questions: questionRepo,
    attempts: attemptRepo,
    settings: settingsRepo,
    generatedQuestions: generatedQuestionRepo,
    diagnostics: diagnosticsRepo,
    cache: cacheRepo,
  };
}