import { createInitialData, normalizeRisData } from './data';

export const STORAGE_KEYS = {
  data: 'ris-prototype-data-v3',
  session: 'ris-prototype-session-v1',
};

const LEGACY_DATA_KEYS = [
  'ris-react-module-four-data-v2',
  'ris-react-module-one-data-v1',
  'ris-react-module-two-data-v1',
  'ris-react-module-three-data-v1',
  'ris-react-module-four-data-v1',
];

const LEGACY_SESSION_KEYS = [
  'ris-react-session-v5',
  'ris-react-session',
  'ris-react-session-v1',
  'ris-react-session-v2',
  'ris-react-session-v3',
  'ris-react-session-v4',
];

const browserStorage = () => {
  try {
    return typeof window !== 'undefined' ? window.localStorage : null;
  } catch (error) {
    return null;
  }
};

const parseStoredValue = value => {
  if (!value) return null;
  try {
    return JSON.parse(value);
  } catch (error) {
    return null;
  }
};

export const createLocalDataGateway = (storage = browserStorage()) => {
  const read = key => {
    try {
      return storage ? parseStoredValue(storage.getItem(key)) : null;
    } catch (error) {
      return null;
    }
  };

  const write = (key, value) => {
    try {
      if (storage) storage.setItem(key, JSON.stringify(value));
      return true;
    } catch (error) {
      return false;
    }
  };

  const remove = key => {
    try {
      if (storage) storage.removeItem(key);
    } catch (error) {
      // Storage can be disabled or full; the application still works in memory.
    }
  };

  const readFirst = keys => keys.reduce((found, key) => found || read(key), null);
  const removeMany = keys => keys.forEach(remove);

  const loadData = () => {
    const stored = read(STORAGE_KEYS.data) || readFirst(LEGACY_DATA_KEYS);
    const normalized = normalizeRisData(stored || createInitialData());
    write(STORAGE_KEYS.data, normalized);
    removeMany(LEGACY_DATA_KEYS);
    return normalized;
  };

  const saveData = value => {
    const normalized = normalizeRisData(value || createInitialData());
    write(STORAGE_KEYS.data, normalized);
    return normalized;
  };

  const resetData = () => saveData(createInitialData());

  const loadSession = () => {
    const session = read(STORAGE_KEYS.session) || readFirst(LEGACY_SESSION_KEYS);
    if (session) write(STORAGE_KEYS.session, session);
    removeMany(LEGACY_SESSION_KEYS);
    return session;
  };

  const saveSession = session => {
    write(STORAGE_KEYS.session, session);
    return session;
  };

  const clearSession = () => {
    remove(STORAGE_KEYS.session);
    removeMany(LEGACY_SESSION_KEYS);
  };

  return {
    kind: 'prototype-local',
    loadData,
    saveData,
    resetData,
    loadSession,
    saveSession,
    clearSession,
  };
};

export const prototypeDataGateway = createLocalDataGateway();
