/* eslint-disable object-curly-newline, object-property-newline, no-multiple-empty-lines, prefer-destructuring, no-use-before-define, react/prop-types */
import React, {
  createContext, useCallback, useContext, useEffect, useMemo, useRef, useState
} from 'react';
import PropTypes from 'prop-types';
import { DEMO_ACCOUNTS } from './data';
import { prototypeDataGateway } from './dataGateway';
import { appendWorkflowNotifications, inferMutationToast } from './notificationWorkflow';
import { appendScheduledEmailReminders } from './emailNotificationWorkflow';
import { clearEmailDeliveryStatusCache, syncOptionalEmailOutbox } from './emailDeliveryGateway';
import { MANAGER_MODE, ROLE, normalizeRole } from './workflow';

const EMAIL_REMINDER_REFRESH_MS = 60 * 60 * 1000;

const normalizeManagerMode = (account, requestedMode) => {
  if (normalizeRole(account && account.role) !== ROLE.MANAGER) return null;
  return requestedMode === MANAGER_MODE.LECTURER ? MANAGER_MODE.LECTURER : MANAGER_MODE.MANAGEMENT;
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
  const session = prototypeDataGateway.loadSession();
  if (!session || !session.email || !session.role) {
    prototypeDataGateway.clearSession();
    return null;
  }

  const normalizedEmail = String(session.email || '').trim().toLowerCase();
  const activeAccount = getAuthAccounts(data).find(account => String(account.email || '').trim().toLowerCase() === normalizedEmail && account.isActive !== false);
  if (!activeAccount) {
    prototypeDataGateway.clearSession();
    return null;
  }

  return {
    id: activeAccount.id,
    name: activeAccount.name,
    email: activeAccount.email,
    role: activeAccount.role,
    managerMode: normalizeManagerMode(activeAccount, session.managerMode),
    adminScopes: activeAccount.adminScopes || [],
    profileId: activeAccount.profileId,
    applicantType: activeAccount.applicantType || null,
    identifier: activeAccount.identifier || null,
  };
};

const RisContext = createContext(null);

export function RisProvider({ children }) {
  const [initialState] = useState(() => {
    const initialData = prototypeDataGateway.loadData();
    return { data: initialData, user: normalizeStoredSession(initialData) };
  });
  const [data, setDataState] = useState(initialState.data);
  const [user, setUserState] = useState(initialState.user);
  const [toasts, setToasts] = useState([]);
  const previousDataRef = useRef(initialState.data);
  const suppressToastRef = useRef(false);

  const dismissToast = useCallback(id => {
    setToasts(current => current.filter(toast => toast.id !== id));
  }, []);

  const showToast = useCallback(toast => {
    const id = `toast-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const nextToast = {
      id,
      tone: toast.tone || 'info',
      title: toast.title || 'Pemberitahuan',
      message: toast.message || '',
    };
    setToasts(current => [...current.slice(-2), nextToast]);
    setTimeout(() => dismissToast(id), toast.duration || 4500);
    return id;
  }, [dismissToast]);

  useEffect(() => {
    const previous = previousDataRef.current;
    previousDataRef.current = data;
    if (suppressToastRef.current) {
      suppressToastRef.current = false;
      return;
    }
    if (!user || previous === data) return;
    const toast = inferMutationToast(previous, data, user);
    if (toast) showToast(toast);
  }, [data, showToast, user]);

  useEffect(() => {
    const enqueueReminders = () => {
      setDataState(current => {
        const next = appendScheduledEmailReminders(current, new Date());
        return next === current ? current : prototypeDataGateway.saveData(next);
      });
    };
    enqueueReminders();
    const timer = setInterval(enqueueReminders, EMAIL_REMINDER_REFRESH_MS);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (user) syncOptionalEmailOutbox(data.emailOutbox || [], user);
  }, [data.emailOutbox, user]);

  const setData = updater => {
    // Prototype persistence stays active by design. Production replacements for
    // every data domain are mapped in productionDataApi.reference.js.
    setDataState(current => {
      const next = typeof updater === 'function' ? updater(current) : updater;
      const enriched = appendWorkflowNotifications(current, next, user);
      return prototypeDataGateway.saveData(enriched);
    });
  };

  const markNotificationRead = notificationId => {
    if (!notificationId) return;
    setData(current => ({
      ...current,
      notifications: (current.notifications || []).map(notification => ([notification.id, notification.notificationId].includes(notificationId) ? { ...notification, isRead: true, readAt: new Date().toISOString() } : notification)),
      notificationReadIds: [...new Set([...(current.notificationReadIds || []), notificationId])],
    }));
  };

  const markNotificationsRead = notificationIds => {
    const ids = [...new Set((notificationIds || []).filter(Boolean))];
    if (!ids.length) return;
    setData(current => ({
      ...current,
      notifications: (current.notifications || []).map(notification => (ids.some(id => [notification.id, notification.notificationId].includes(id)) ? { ...notification, isRead: true, readAt: new Date().toISOString() } : notification)),
      notificationReadIds: [...new Set([...(current.notificationReadIds || []), ...ids])],
    }));
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
      managerMode: normalizeManagerMode(account, MANAGER_MODE.MANAGEMENT),
      adminScopes: account.adminScopes || [],
      profileId: account.profileId,
      applicantType: account.applicantType || null,
      identifier: account.identifier || null,
    };
    prototypeDataGateway.saveSession(session);
    setUserState(session);
    return true;
  };

  const logout = () => {
    prototypeDataGateway.clearSession();
    clearEmailDeliveryStatusCache();
    setUserState(null);
  };

  const setManagerMode = managerMode => {
    if (!user || normalizeRole(user.role) !== ROLE.MANAGER) return;
    const next = { ...user, managerMode: normalizeManagerMode(user, managerMode) };
    prototypeDataGateway.saveSession(next);
    setUserState(next);
  };

  const resetDemo = () => {
    suppressToastRef.current = true;
    const next = prototypeDataGateway.resetData();
    setDataState(next);
  };

  const value = useMemo(() => ({
    data, setData, user, login, logout, setManagerMode, resetDemo, dataGatewayKind: prototypeDataGateway.kind,
    toasts, showToast, dismissToast, markNotificationRead, markNotificationsRead
  }), [data, dismissToast, showToast, toasts, user]);

  return <RisContext.Provider value={value}>{children}</RisContext.Provider>;
}

RisProvider.propTypes = { children: PropTypes.node.isRequired };

export const useRis = () => useContext(RisContext);
