/* eslint-disable object-curly-newline, object-property-newline, no-multiple-empty-lines, prefer-destructuring, no-use-before-define, react/prop-types */
import React, { useEffect, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import { NavLink, useHistory, useLocation } from 'react-router-dom';
import { useRis } from '../RisContext';
import Icon from './Icon';
import {
  canAccessExternalResearch,
  canAccessArchive,
  canAccessLetters,
  canAccessResearchSubmission,
  canAccessResearcherProfiles,
  canAccessSchemeManagement,
  getRoleLabel,
  isManagerAccount,
  MANAGER_MODE,
} from '../workflow';
import { hasFundedResearch } from '../schemeDataWorkflow';
import NotificationCenter, { ToastHost } from './NotificationCenter';

const SIDEBAR_COLLAPSE_KEY = 'ris-sidebar-collapsed';

const initialSidebarCollapsed = () => {
  try {
    return window.localStorage.getItem(SIDEBAR_COLLAPSE_KEY) === 'true';
  } catch (error) {
    return false;
  }
};

export default function Layout({ children }) {
  const { data, user, logout, setManagerMode, resetDemo } = useRis();
  const history = useHistory();
  const location = useLocation();
  const [profileOpen, setProfileOpen] = useState(false);
  const [researchOpen, setResearchOpen] = useState(false);
  const [submissionOpen, setSubmissionOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(initialSidebarCollapsed);
  const profileRef = useRef(null);
  const researchMenuAvailable = canAccessSchemeManagement(user);
  const submissionMenuAvailable = canAccessResearchSubmission(user) && !researchMenuAvailable;
  const fundedMenuAvailable = submissionMenuAvailable && hasFundedResearch(data, user);
  const researchPathActive = location.pathname.startsWith('/ris/skema')
    || (researchMenuAvailable && location.pathname.startsWith('/ris/pengajuan-penelitian-internal'))
    || (researchMenuAvailable && location.pathname.startsWith('/ris/penelitian-didanai'));
  const submissionPathActive = location.pathname.startsWith('/ris/pengajuan-penelitian-internal')
    || location.pathname.startsWith('/ris/penelitian-didanai');
  const showPrototypeTools = process.env.NODE_ENV !== 'production';
  const managerAccount = isManagerAccount(user);

  useEffect(() => {
    const close = event => {
      if (profileRef.current && !profileRef.current.contains(event.target)) setProfileOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  useEffect(() => {
    if (researchMenuAvailable && researchPathActive) setResearchOpen(true);
  }, [researchMenuAvailable, researchPathActive]);

  useEffect(() => {
    if (fundedMenuAvailable && submissionPathActive) setSubmissionOpen(true);
  }, [fundedMenuAvailable, submissionPathActive]);

  useEffect(() => {
    try {
      window.localStorage.setItem(SIDEBAR_COLLAPSE_KEY, String(sidebarCollapsed));
    } catch (error) {
      // The layout remains usable when browser storage is unavailable.
    }
  }, [sidebarCollapsed]);

  const signOut = () => {
    logout();
    history.replace('/login');
  };

  const switchManagerMode = mode => {
    setManagerMode(mode);
    setMobileOpen(false);
    setResearchOpen(false);
    setSubmissionOpen(false);
    history.push('/ris');
  };

  const toggleDesktopSidebar = () => {
    setProfileOpen(false);
    setSidebarCollapsed(value => !value);
  };

  const toggleSubmissionMenu = () => {
    if (sidebarCollapsed) {
      setSidebarCollapsed(false);
      setSubmissionOpen(true);
      return;
    }
    setSubmissionOpen(value => !value);
  };

  const toggleResearchMenu = () => {
    if (sidebarCollapsed) {
      setSidebarCollapsed(false);
      setResearchOpen(true);
      return;
    }
    setResearchOpen(value => !value);
  };

  const item = (to, icon, label, exact = false, relatedPaths = []) => (
    <NavLink exact={exact} to={to} className="ris-nav-item" activeClassName="active" isActive={(match, currentLocation) => Boolean(match) || relatedPaths.some(path => currentLocation.pathname.startsWith(path))} onClick={() => setMobileOpen(false)} aria-label={label} title={sidebarCollapsed ? label : undefined}>
      <Icon name={icon} /> <span>{label}</span>
    </NavLink>
  );

  return (
    <div className={`ris-shell ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
      <header className="ris-header">
        <img src="/images/ris/ris-logo.png" alt="RIS Logo" className="ris-header-logo" />
        <NotificationCenter />
      </header>
      <div className="ris-body">
        <aside id="ris-sidebar" className={`ris-sidebar ${sidebarCollapsed ? 'collapsed' : ''} ${mobileOpen ? 'open' : ''}`}>
          <button type="button" className="ris-sidebar-toggle ris-sidebar-desktop-toggle" onClick={toggleDesktopSidebar} aria-label={sidebarCollapsed ? 'Buka menu utama' : 'Tutup menu utama'} title={sidebarCollapsed ? 'Buka menu utama' : 'Tutup menu utama'} aria-expanded={!sidebarCollapsed} aria-controls="ris-sidebar"><Icon name="menu" size={22} /></button>
          <button type="button" className="ris-sidebar-toggle ris-sidebar-mobile-toggle" onClick={() => setMobileOpen(value => !value)} aria-label={mobileOpen ? 'Tutup menu utama' : 'Buka menu utama'} title={mobileOpen ? 'Tutup menu utama' : 'Buka menu utama'} aria-expanded={mobileOpen} aria-controls="ris-sidebar"><Icon name="menu" size={22} /></button>
          <div className="ris-sidebar-content">
            {managerAccount && <div className="ris-manager-mode" role="group" aria-label="Mode akses Manajer">
              <span>Mode akses</span>
              <div>
                <button type="button" className={user.managerMode !== MANAGER_MODE.LECTURER ? 'active' : ''} aria-label="Mode Manajemen" title={sidebarCollapsed ? 'Mode Manajemen' : undefined} aria-pressed={user.managerMode !== MANAGER_MODE.LECTURER} onClick={() => switchManagerMode(MANAGER_MODE.MANAGEMENT)}><Icon name="layers" size={15} /><span>Manajemen</span></button>
                <button type="button" className={user.managerMode === MANAGER_MODE.LECTURER ? 'active' : ''} aria-label="Mode Dosen" title={sidebarCollapsed ? 'Mode Dosen' : undefined} aria-pressed={user.managerMode === MANAGER_MODE.LECTURER} onClick={() => switchManagerMode(MANAGER_MODE.LECTURER)}><Icon name="user" size={15} /><span>Dosen</span></button>
              </div>
            </div>}
            {item('/ris', 'dashboard', 'Dasbor', true)}
            {submissionMenuAvailable && !fundedMenuAvailable && item('/ris/pengajuan-penelitian-internal', 'document', 'Pengajuan Penelitian Internal', false, ['/ris/pengajuan-penelitian-internal/daftar-skema'])}
            {fundedMenuAvailable && <button type="button" className={`ris-nav-item ris-nav-button ${submissionPathActive ? 'active' : ''}`} onClick={toggleSubmissionMenu} aria-label="Pengajuan Penelitian Internal" title={sidebarCollapsed ? 'Pengajuan Penelitian Internal' : undefined} aria-expanded={submissionOpen} aria-controls="ris-submission-subnav">
              <Icon name="document" /><span>Pengajuan Penelitian Internal</span><Icon name="chevron" size={16} className={submissionOpen ? 'rotate' : ''} />
            </button>}
            {fundedMenuAvailable && submissionOpen && (
              <div id="ris-submission-subnav" className="ris-subnav">
                <NavLink to="/ris/pengajuan-penelitian-internal/daftar-skema" activeClassName="active" onClick={() => setMobileOpen(false)}>Daftar Skema</NavLink>
                <NavLink to="/ris/pengajuan-penelitian-internal/penelitian-didanai" activeClassName="active" onClick={() => setMobileOpen(false)}>Penelitian Didanai</NavLink>
              </div>
            )}
            {researchMenuAvailable && <button type="button" className={`ris-nav-item ris-nav-button ${researchPathActive ? 'active' : ''}`} onClick={toggleResearchMenu} aria-label="Manajemen Penelitian" title={sidebarCollapsed ? 'Manajemen Penelitian' : undefined} aria-expanded={researchOpen} aria-controls="ris-research-subnav">
              <Icon name="layers" /><span>Manajemen Penelitian</span><Icon name="chevron" size={16} className={researchOpen ? 'rotate' : ''} />
            </button>}
            {researchMenuAvailable && researchOpen && (
              <div id="ris-research-subnav" className="ris-subnav">
                <NavLink exact to="/ris/skema" activeClassName="active" onClick={() => setMobileOpen(false)}>Daftar Skema</NavLink>
                <NavLink to="/ris/skema/pengajuan" activeClassName="active" onClick={() => setMobileOpen(false)}>Pemantauan Penelitian</NavLink>
                <NavLink to="/ris/pengajuan-penelitian-internal/penelitian-didanai" activeClassName="active" onClick={() => setMobileOpen(false)}>Pemantauan Penelitian Didanai</NavLink>
              </div>
            )}
            {canAccessLetters(user) && item('/ris/pengajuan-surat', 'mail', 'Pengajuan Surat')}
            {canAccessResearcherProfiles(user) && item('/ris/profil-peneliti', 'user', 'Manajemen Informasi Peneliti')}
            {canAccessExternalResearch(user) && item('/ris/penelitian-eksternal', 'report', 'Pelaporan Penelitian Eksternal')}
            {canAccessArchive(user) && item('/ris/arsip', 'archive', 'Arsip')}
          </div>
          <div className="ris-sidebar-account" ref={profileRef}>
            {profileOpen && <div className="ris-profile-menu" role="menu">
              <div className="ris-profile-menu-identity"><strong>{user.name}</strong><span>{user.email}</span><small>{getRoleLabel(user)}</small></div>
              <button type="button" role="menuitem" onClick={() => { setProfileOpen(false); setMobileOpen(false); history.push('/ris/profil-saya'); }}><Icon name="user" size={17} />Profil Saya</button>
              {showPrototypeTools && <button type="button" role="menuitem" onClick={() => { resetDemo(); setProfileOpen(false); }}><Icon name="dashboard" size={17} />Atur ulang data demo</button>}
              <button type="button" role="menuitem" className="danger" onClick={signOut}><Icon name="logout" size={17} />Log out</button>
            </div>}
            <button type="button" className="ris-sidebar-account-button" onClick={() => setProfileOpen(value => !value)} aria-label="Menu akun" title={sidebarCollapsed ? `${user.name} - Menu akun` : undefined} aria-haspopup="menu" aria-expanded={profileOpen}>
              <span className="ris-sidebar-avatar"><Icon name="user" size={20} /></span>
              <span className="ris-sidebar-account-copy"><strong>{user.name}</strong><small>{getRoleLabel(user)}</small></span>
              <Icon name="chevron" size={16} className={profileOpen ? 'rotate' : ''} />
            </button>
          </div>
        </aside>
        {mobileOpen && <button type="button" aria-label="Tutup menu" className="ris-sidebar-overlay" onClick={() => setMobileOpen(false)} />}
        <main className="ris-main">{children}</main>
      </div>
      <ToastHost />
    </div>
  );
}

Layout.propTypes = { children: PropTypes.node.isRequired };
