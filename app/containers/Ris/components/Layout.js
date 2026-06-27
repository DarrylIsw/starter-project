/* eslint-disable object-curly-newline, object-property-newline, no-multiple-empty-lines, prefer-destructuring, no-use-before-define, react/prop-types */
import React, { useEffect, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import { NavLink, useHistory, useLocation } from 'react-router-dom';
import { useRis } from '../RisContext';
import Icon from './Icon';
import {
  canAccessExternalResearch,
  canAccessLetters,
  canAccessResearchReports,
  canAccessResearchSubmission,
  canAccessResearcherProfiles,
  canAccessSchemeManagement,
  getRoleLabel,
} from '../workflow';

export default function Layout({ children }) {
  const { user, logout, resetDemo } = useRis();
  const history = useHistory();
  const location = useLocation();
  const [profileOpen, setProfileOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const profileRef = useRef(null);
  const reportMenuAvailable = canAccessExternalResearch(user) || canAccessResearchReports(user);
  const reportPathActive = ['/ris/penelitian-eksternal', '/ris/logbook', '/ris/laporan-luaran'].some(path => location.pathname.startsWith(path));

  useEffect(() => {
    const close = event => {
      if (profileRef.current && !profileRef.current.contains(event.target)) setProfileOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  useEffect(() => {
    if (reportPathActive) setReportOpen(true);
  }, [reportPathActive]);

  const signOut = () => {
    logout();
    history.replace('/login');
  };

  const item = (to, icon, label, exact = false) => (
    <NavLink exact={exact} to={to} className="ris-nav-item" activeClassName="active" onClick={() => setMobileOpen(false)}>
      <Icon name={icon} /> <span>{label}</span>
    </NavLink>
  );

  return (
    <div className="ris-shell">
      <header className="ris-header">
        <button type="button" className="ris-menu-toggle" onClick={() => setMobileOpen(value => !value)} aria-label="Menu">☰</button>
        <img src="/images/ris/ris-logo.png" alt="RIS Logo" className="ris-header-logo" />
        <div className="ris-profile" ref={profileRef}>
          <button type="button" className="ris-profile-button" onClick={() => setProfileOpen(value => !value)}><Icon name="user" size={28} /></button>
          {profileOpen && (
            <div className="ris-profile-menu">
              <div><strong>{user.name}</strong><span>{user.email}</span><small>{getRoleLabel(user)}</small></div>
              <button type="button" onClick={resetDemo}>Reset data demo</button>
              <button type="button" className="danger" onClick={signOut}>Log out</button>
            </div>
          )}
        </div>
      </header>
      <div className="ris-body">
        <aside className={`ris-sidebar ${mobileOpen ? 'open' : ''}`}>
          {item('/ris', 'dashboard', 'Dashboard', true)}
          {canAccessResearchSubmission(user) && item('/ris/pengajuan-penelitian-internal', 'document', 'Pengajuan Penelitian Internal')}
          {canAccessSchemeManagement(user) && item('/ris/skema/create', 'layers', 'Pembuatan Skema')}
          {canAccessLetters(user) && item('/ris/pengajuan-surat', 'mail', 'Pengajuan Surat')}
          {canAccessResearcherProfiles(user) && item('/ris/profil-peneliti', 'user', 'Manajemen Informasi Peneliti')}
          {reportMenuAvailable && <button type="button" className={`ris-nav-item ris-nav-button ${reportPathActive ? 'active' : ''}`} onClick={() => setReportOpen(value => !value)}>
            <Icon name="report" /><span>Pelaporan</span><Icon name="chevron" size={16} className={reportOpen ? 'rotate' : ''} />
          </button>}
          {reportMenuAvailable && reportOpen && (
            <div className="ris-subnav">
              {canAccessResearchReports(user) && <NavLink to="/ris/logbook" activeClassName="active" onClick={() => setMobileOpen(false)}>Logbook Penelitian</NavLink>}
              {canAccessResearchReports(user) && <NavLink to="/ris/laporan-luaran" activeClassName="active" onClick={() => setMobileOpen(false)}>Pelaporan Luaran</NavLink>}
              {canAccessExternalResearch(user) && <NavLink to="/ris/penelitian-eksternal" activeClassName="active" onClick={() => setMobileOpen(false)}>Penelitian Eksternal</NavLink>}
            </div>
          )}
        </aside>
        {mobileOpen && <button type="button" aria-label="Tutup menu" className="ris-sidebar-overlay" onClick={() => setMobileOpen(false)} />}
        <main className="ris-main">{children}</main>
      </div>
    </div>
  );
}

Layout.propTypes = { children: PropTypes.node.isRequired };
