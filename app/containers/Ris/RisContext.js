/* eslint-disable object-curly-newline, object-property-newline, no-multiple-empty-lines, prefer-destructuring, no-use-before-define, react/prop-types */
import React, {
  createContext, useContext, useMemo, useState
} from 'react';
import PropTypes from 'prop-types';
import { createInitialData, DEMO_ACCOUNTS, normalizeRisData } from './data';

const DATA_KEY = 'ris-react-module-four-data-v2';
const SESSION_KEY = 'ris-react-session-v5';
const LEGACY_KEYS = [
  'ris-react-module-one-data-v1',
  'ris-react-module-two-data-v1',
  'ris-react-module-three-data-v1',
  'ris-react-module-four-data-v1',
  'ris-react-session',
  'ris-react-session-v1',
  'ris-react-session-v2',
  'ris-react-session-v3',
  'ris-react-session-v4',
];

const isBrowser = () => typeof window !== 'undefined' && window.localStorage;

const removeLegacyStorage = () => {
  if (!isBrowser()) return;
  LEGACY_KEYS.forEach(key => {
    try {
      window.localStorage.removeItem(key);
    } catch (error) {
      // ignore localStorage cleanup error
    }
  });
};

const readJson = (key, fallback) => {
  try {
    if (!isBrowser()) return fallback;
    const value = window.localStorage.getItem(key);
    return value ? JSON.parse(value) : fallback;
  } catch (error) {
    return fallback;
  }
};

const writeJson = (key, value) => {
  try {
    if (isBrowser()) window.localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    // ignore write error; app can still run in memory
  }
};

const removeKey = key => {
  try {
    if (isBrowser()) window.localStorage.removeItem(key);
  } catch (error) {
    // ignore remove error
  }
};

const normalizeStoredData = () => {
  removeLegacyStorage();
  try {
    return normalizeRisData(readJson(DATA_KEY, createInitialData()));
  } catch (error) {
    const fresh = createInitialData();
    writeJson(DATA_KEY, fresh);
    return fresh;
  }
};

const getAuthAccounts = data => {
  const seen = new Set();
  const source = data && Array.isArray(data.systemUsers) && data.systemUsers.length
    ? data.systemUsers
    : DEMO_ACCOUNTS;
  return [...source, ...DEMO_ACCOUNTS].filter(account => {
    const key = String(account && account.email ? account.email : '').trim().toLowerCase();
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

const normalizeStoredSession = data => {
  const session = readJson(SESSION_KEY, null);
  if (!session || !session.email || !session.role) {
    removeKey(SESSION_KEY);
    return null;
  }

  const normalizedEmail = String(session.email || '').trim().toLowerCase();
  const activeAccount = getAuthAccounts(data).find(account => String(account.email || '').trim().toLowerCase() === normalizedEmail && account.isActive !== false);
  if (!activeAccount) {
    removeKey(SESSION_KEY);
    return null;
  }

  return {
    id: activeAccount.id,
    name: activeAccount.name,
    email: activeAccount.email,
    role: activeAccount.role,
    profileId: activeAccount.profileId,
    applicantType: activeAccount.applicantType || null,
    identifier: activeAccount.identifier || null,
  };
};

const RisContext = createContext(null);

export function RisProvider({ children }) {
  const [data, setDataState] = useState(() => normalizeStoredData());
  const [user, setUserState] = useState(() => normalizeStoredSession(normalizeStoredData()));

  const setData = updater => {
    setDataState(current => {
      const next = typeof updater === 'function' ? updater(current) : updater;
      const normalized = normalizeRisData(next);
      writeJson(DATA_KEY, normalized);
      return normalized;
    });
  };

  const login = (email, password) => {
    const normalized = String(email || '').trim().toLowerCase();
    const account = getAuthAccounts(data).find(item => String(item.email || '').trim().toLowerCase() === normalized && item.password === password && item.isActive !== false);
    if (!account) return false;
    const session = {
      id: account.id,
      name: account.name,
      email: account.email,
      role: account.role,
      profileId: account.profileId,
      applicantType: account.applicantType || null,
      identifier: account.identifier || null,
    };
    writeJson(SESSION_KEY, session);
    setUserState(session);
    return true;
  };

  const logout = () => {
    removeKey(SESSION_KEY);
    setUserState(null);
  };

  const resetDemo = () => {
    const next = createInitialData();
    writeJson(DATA_KEY, next);
    setDataState(next);
  };

  const value = useMemo(() => ({
    data, setData, user, login, logout, resetDemo
  }), [data, user]);

  return <RisContext.Provider value={value}>{children}</RisContext.Provider>;
}

RisProvider.propTypes = { children: PropTypes.node.isRequired };

export const useRis = () => useContext(RisContext);
