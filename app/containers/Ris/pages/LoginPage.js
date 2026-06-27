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
    else setError('These credentials do not match our records.');
  };

  return (
    <div className="ris-login">
      <section className="ris-login-hero">
        <img src="/images/ris/login-background.png" alt="UMN Background" className="ris-login-bg" />
        <div className="ris-login-title">
          <img src="/images/ris/4-circles.png" alt="" />
          <h1>Research Innovation and Sustainability</h1>
        </div>
      </section>
      <section className="ris-login-panel">
        <img src="/images/ris/ris-logo.png" alt="RIS Logo" className="ris-login-logo" />
        <h2>Sign In</h2>
        <form onSubmit={submit}>
          {error && <div className="ris-alert ris-alert-error">{error}</div>}
          <input type="email" placeholder="Email" required autoComplete="email" value={form.email} onChange={event => setForm({ ...form, email: event.target.value })} />
          <input type="password" placeholder="Password" required autoComplete="current-password" value={form.password} onChange={event => setForm({ ...form, password: event.target.value })} />
          <div className="ris-login-options">
            <label><input type="checkbox" checked={form.remember} onChange={event => setForm({ ...form, remember: event.target.checked })} /> Remember Me</label>
            <button type="button">Forgot password?</button>
          </div>
          <button type="submit" className="ris-login-submit">Log in</button>
        </form>
        <div className="ris-login-divider"><span />Or login with<span /></div>
        <button type="button" className="ris-sso">Single Sign On (SSO)</button>
      </section>
    </div>
  );
}
