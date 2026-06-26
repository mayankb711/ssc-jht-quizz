/* ============================================================
   infrastructure/repositories/backup-adapter.js — Backup repository implementation
 * Wraps existing backup functionality with repository interface
 * ============================================================ */

import { IBackupRepository } from './interfaces.js';
import { validateImportPayload } from '../../domain/validation.js';
import { migrateBackupPayload } from '../../domain/migrations.js';

/**
 * Backup Repository
 * Handles backup export/import operations using other repositories
 */
export class BackupRepository extends IBackupRepository {
  constructor(repositories) {
    super();
    this.repositories = repositories;
  }

  async export() {
    const { attempts, generatedQuestions, diagnostics, settings } = this.repositories;
    const { QUESTIONS } = await import('../../data/questions.js');

    return {
      v: 2,
      exportedAt: new Date().toISOString(),
      attempts: await attempts.getAll(),
      generatedQuestions: await generatedQuestions.getAll(),
      errorReports: await diagnostics.getAllReports(),
      settings: await settings.getAll(),
      sourceCounts: {
        curatedQuestions: QUESTIONS.length,
      },
    };
  }

  async import(payload) {
    // Validate payload structure
    validateImportPayload(payload);

    // Migrate to current version
    const migrated = migrateBackupPayload(payload);

    const { attempts, generatedQuestions, diagnostics, settings } = this.repositories;
    const importSummary = {
      attempts: 0,
      generatedQuestions: 0,
      errorReports: 0,
      settings: 0,
    };

    // Import settings
    if (migrated.settings) {
      await settings.setMany(migrated.settings);
      importSummary.settings = Object.keys(migrated.settings).length;
    }

    // Import attempts
    if (Array.isArray(migrated.attempts)) {
      await attempts.replaceAll(migrated.attempts);
      importSummary.attempts = migrated.attempts.length;
    }

    // Import generated questions
    if (Array.isArray(migrated.generatedQuestions)) {
      for (const q of migrated.generatedQuestions) {
        if (q && q.id) {
          await generatedQuestions.upsert(q);
        }
      }
      importSummary.generatedQuestions = migrated.generatedQuestions.length;
    }

    // Import error reports
    if (Array.isArray(migrated.errorReports)) {
      const { setReports } = await import('../../core/diagnostics.js');
      await setReports(migrated.errorReports);
      importSummary.errorReports = migrated.errorReports.length;
    }

    return importSummary;
  }

  async getMetadata() {
    const { attempts, generatedQuestions, diagnostics } = this.repositories;
    
    const allAttempts = await attempts.getAll();
    const allGenerated = await generatedQuestions.getAll();
    const allReports = await diagnostics.getAllReports();

    return {
      totalAttempts: allAttempts.length,
      totalGeneratedQuestions: allGenerated.length,
      totalErrorReports: allReports.length,
      lastActivity: allAttempts.length > 0 
        ? new Date(Math.max(...allAttempts.map(a => a.ts))).toISOString()
        : null,
    };
  }
}

/**
 * Export backup and trigger download
 */
export async function downloadBackup(repositories) {
  const backupRepo = new BackupRepository(repositories);
  const payload = await backupRepo.export();
  
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `sscjht-backup-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
  
  return payload;
}

/**
 * Import backup from file
 */
export async function importBackupFromFile(file, repositories) {
  const backupRepo = new BackupRepository(repositories);
  
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const payload = JSON.parse(e.target.result);
        const summary = await backupRepo.import(payload);
        resolve(summary);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsText(file);
  });
}