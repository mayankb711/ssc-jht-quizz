/* ============================================================
   shared/events.js — Enhanced event bus with domain events
 * Core event system with typed domain events for clean architecture
 * ============================================================ */

const listeners = new Map();
const eventHistory = [];
const MAX_HISTORY = 100;

/**
 * Domain event types
 * Defines all events that can be emitted in the system
 */
export const DomainEvents = {
  // Quiz events
  QUIZ_STARTED: 'quiz.started',
  QUIZ_FINISHED: 'quiz.finished',
  QUIZ_ABANDONED: 'quiz.abandoned',
  QUIZ_PAUSED: 'quiz.paused',
  QUIZ_RESUMED: 'quiz.resumed',
  QUESTION_ANSWERED: 'question.answered',
  QUESTION_REVEALED: 'question.revealed',
  QUESTION_SKIPPED: 'question.skipped',
  
  // Progress events
  ATTEMPT_RECORDED: 'attempt.recorded',
  MASTERY_UPDATED: 'mastery.updated',
  STREAK_UPDATED: 'streak.updated',
  
  // Backup events
  BACKUP_EXPORTED: 'backup.exported',
  BACKUP_IMPORTED: 'backup.imported',
  BACKUP_IMPORT_FAILED: 'backup.import_failed',
  
  // Settings events
  SETTINGS_CHANGED: 'settings.changed',
  THEME_CHANGED: 'theme.changed',
  
  // AI events
  AI_REQUESTED: 'ai.requested',
  AI_COMPLETED: 'ai.completed',
  AI_FAILED: 'ai.failed',
  AI_USAGE_UPDATED: 'ai.usage_updated',
  
  // Error events
  ERROR_LOGGED: 'error.logged',
  ERROR_RESOLVED: 'error.resolved',
  
  // Sync events
  SYNC_STARTED: 'sync.started',
  SYNC_COMPLETED: 'sync.completed',
  SYNC_FAILED: 'sync.failed',
  
  // System events
  APP_READY: 'app.ready',
  NAVIGATION_CHANGED: 'navigation.changed',

  // Bookmark events
  BOOKMARK_CHANGED: 'bookmark.changed',

  // Confidence events
  CONFIDENCE_RECORDED: 'confidence.recorded',

  // Search events
  SEARCH_REQUESTED: 'search.requested',

  // Topic stats events
  TOPIC_ACCUMULATOR_UPDATED: 'topic_accumulator.updated',

  // Session events
  SESSION_STATS_UPDATED: 'session_stats.updated',

  // Queue events
  QUEUE_UPDATED: 'queue.updated',
};

/**
 * Subscribe to an event type
 * @param {string} type - Event type
 * @param {Function} handler - Event handler function
 * @returns {Function} Unsubscribe function
 */
export function on(type, handler) {
  const set = listeners.get(type) || new Set();
  set.add(handler);
  listeners.set(type, set);
  return () => off(type, handler);
}

/**
 * Unsubscribe from an event type
 * @param {string} type - Event type
 * @param {Function} handler - Event handler function
 */
export function off(type, handler) {
  const set = listeners.get(type);
  if (!set) return;
  set.delete(handler);
  if (!set.size) listeners.delete(type);
}

/**
 * Emit an event
 * @param {string} type - Event type
 * @param {*} payload - Event payload
 */
export function emit(type, payload) {
  const event = {
    type,
    payload,
    timestamp: Date.now(),
    id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
  };

  // Add to history
  eventHistory.push(event);
  if (eventHistory.length > MAX_HISTORY) {
    eventHistory.shift();
  }

  // Notify listeners
  const set = listeners.get(type);
  if (set) {
    for (const handler of [...set]) {
      try {
        handler(payload, event);
      } catch (err) {
        console.error(`Error in event handler for ${type}:`, err);
        emit(DomainEvents.ERROR_LOGGED, {
          title: `Event handler error: ${type}`,
          message: err.message,
          stack: err.stack,
          context: { eventType: type, payload },
        });
      }
    }
  }
}

/**
 * Clear listeners for a specific event type or all events
 * @param {string} type - Event type (optional, clears all if not provided)
 */
export function clear(type) {
  if (type) listeners.delete(type);
  else listeners.clear();
}

/**
 * Get event history
 * @param {string} type - Optional event type filter
 * @returns {Array} Event history
 */
export function getHistory(type) {
  if (type) {
    return eventHistory.filter(e => e.type === type);
  }
  return [...eventHistory];
}

/**
 * Subscribe to multiple events at once
 * @param {Object} eventMap - Map of event types to handlers
 * @returns {Function} Unsubscribe function for all events
 */
export function onMultiple(eventMap) {
  const unsubscribers = [];
  
  for (const [type, handler] of Object.entries(eventMap)) {
    unsubscribers.push(on(type, handler));
  }
  
  return () => {
    unsubscribers.forEach(unsub => unsub());
  };
}

/**
 * Subscribe to an event once (auto-unsubscribe after first call)
 * @param {string} type - Event type
 * @param {Function} handler - Event handler function
 * @returns {Function} Unsubscribe function
 */
export function once(type, handler) {
  const wrappedHandler = (payload, event) => {
    handler(payload, event);
    off(type, wrappedHandler);
  };
  return on(type, wrappedHandler);
}

/**
 * Wait for an event to occur (returns a promise)
 * @param {string} type - Event type
 * @param {number} timeout - Optional timeout in milliseconds
 * @returns {Promise} Promise that resolves with event payload
 */
export function waitFor(type, timeout) {
  return new Promise((resolve, reject) => {
    const unsub = once(type, (payload) => {
      resolve(payload);
    });
    
    if (timeout) {
      setTimeout(() => {
        unsub();
        reject(new Error(`Timeout waiting for event: ${type}`));
      }, timeout);
    }
  });
}

/**
 * Create an event emitter for a specific domain
 * @param {string} domain - Domain name (e.g., 'quiz', 'progress')
 * @returns {Object} Domain-specific event emitter
 */
export function createDomainEmitter(domain) {
  const prefix = `${domain}.`;
  
  return {
    /**
     * Emit a domain event
     * @param {string} eventType - Event type (without domain prefix)
     * @param {*} payload - Event payload
     */
    emit(eventType, payload) {
      emit(`${prefix}${eventType}`, payload);
    },
    
    /**
     * Subscribe to a domain event
     * @param {string} eventType - Event type (without domain prefix)
     * @param {Function} handler - Event handler function
     * @returns {Function} Unsubscribe function
     */
    on(eventType, handler) {
      return on(`${prefix}${eventType}`, handler);
    },
    
    /**
     * Subscribe to all domain events
     * @param {Function} handler - Event handler function
     * @returns {Function} Unsubscribe function
     */
    onAll(handler) {
      // Since the core event system doesn't support pattern matching,
      // we need to track subscriptions manually
      const subscriptions = [];
      const allEventTypes = Object.values(DomainEvents).filter(type => type.startsWith(prefix));
      
      for (const eventType of allEventTypes) {
        subscriptions.push(on(eventType, (payload, event) => {
          const shortType = event.type.replace(prefix, '');
          handler(shortType, payload, event);
        }));
      }
      
      return () => {
        subscriptions.forEach(unsub => unsub());
      };
    },
  };
}

/**
 * Convenience functions for common domain events
 */
export const quizEvents = createDomainEmitter('quiz');
export const progressEvents = createDomainEmitter('progress');
export const backupEvents = createDomainEmitter('backup');
export const settingsEvents = createDomainEmitter('settings');
export const aiEvents = createDomainEmitter('ai');
export const errorEvents = createDomainEmitter('error');
export const syncEvents = createDomainEmitter('sync');
