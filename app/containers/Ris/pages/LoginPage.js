/* eslint-disable object-curly-newline, object-property-newline, no-multiple-empty-lines, prefer-destructuring, no-use-before-define, react/prop-types */
import React, { useState } from 'react';
import { useHistory } from 'react-router-dom';
import { useRis } from '../RisContext';

export default function LoginPage() {
  const { login } = useRis();
  const history = useHistory();
  const [form, setForm] = useState({ email: '', password: '', remember: false });
  const [error, setError] = useState('');

  const submit = event => {
    event.preventDefault();
    setError('');
    if (login(form.email, form.password)) history.replace('/ris');
    else setError('Email atau kata sandi tidak sesuai.');
  };

  return (
    <div className="ris-login">
      <section className="ris-login-hero">
        <img src="/images/ris/login-background.png" alt="Latar belakang UMN" className="ris-login-bg" />
        <div className="ris-login-title">
          <img src="/images/ris/4-circles.png" alt="" />
          <h1>Research Innovation and Sustainability</h1>
        </div>
      </section>
      <section className="ris-login-panel">
        <img src="/images/ris/ris-logo.png" alt="Logo RIS" className="ris-login-logo" />
        <h2>Masuk</h2>
        <form onSubmit={submit}>
          {error && <div className="ris-alert ris-alert-error" role="alert">{error}</div>}
          <label className="ris-sr-only" htmlFor="ris-login-email">Email</label>
          <input id="ris-login-email" type="email" placeholder="Email" required autoComplete="email" value={form.email} onChange={event => setForm({ ...form, email: event.target.value })} />
          <label className="ris-sr-only" htmlFor="ris-login-password">Kata Sandi</label>
          <input id="ris-login-password" type="password" placeholder="Kata sandi" required autoComplete="current-password" value={form.password} onChange={event => setForm({ ...form, password: event.target.value })} />
          <div className="ris-login-options">
            <label><input type="checkbox" checked={form.remember} onChange={event => setForm({ ...form, remember: event.target.checked })} /> Ingat saya</label>
            <button type="button">Lupa kata sandi?</button>
          </div>
          <button type="submit" className="ris-login-submit">Masuk</button>
        </form>
        <div className="ris-login-divider"><span />Atau masuk dengan<span /></div>
        <button type="button" className="ris-sso">Sistem Masuk Tunggal (SSO)</button>
      </section>
    </div>
  );
}
