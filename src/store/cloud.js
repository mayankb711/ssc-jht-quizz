/*
  cloud.js — unified cloud coordinator.
  Uses Firebase Firestore REST as primary cloud provider.
  Degrades gracefully to local-only when not configured.
  Exposes the same API surface consumers expect.
*/

import * as firebase from './firebase.js';

let _provider = 'local';
let _status = { configured: false, signedIn: false, user: null };
let _listeners = [];

export function onAuthChange(fn) {
  _listeners.push(fn);
  firebase.onAuthChange(notify);
  return () => { _listeners = _listeners.filter(l => l !== fn); };
}

function notify() {
  _status = getStatus();
  _listeners.forEach(fn => fn(_status));
}

export function getStatus() {
  return {
    provider: _provider,
    configured: _status.configured,
    signedIn: _status.signedIn,
    user: _status.user,
    syncInProgress: _status.syncInProgress,
    lastSyncTs: _status.lastSyncTs,
    lastSyncAt: _status.lastSyncAt,
    online: _status.online,
  };
}

export function isOnline() {
  return navigator.onLine;
}

export async function configure() {
  const fbOk = await firebase.configure();
  if (fbOk) {
    _provider = 'firebase';
    _status = firebase.getStatus();
    notify();
    return true;
  }
  _provider = 'local';
  _status = { configured: false, signedIn: false, user: null, syncInProgress: false, lastSyncTs: 0, lastSyncAt: null, online: navigator.onLine };
  notify();
  return false;
}

export function signInMagic(email) {
  return firebase.signInMagic(email);
}

export function signOut() {
  return firebase.signOut();
}

export function getSession() {
  return firebase.getSession();
}

export function recordAttempt(attempt) {
  return firebase.recordAttempt(attempt);
}

export function fetchAttempts() {
  return firebase.fetchAttempts();
}

export function fetchAll() {
  return firebase.fetchAll();
}

export function push() {
  return firebase.push();
}

export function pull() {
  return firebase.pull();
}

export function autoPull() {
  return firebase.autoPull();
}
