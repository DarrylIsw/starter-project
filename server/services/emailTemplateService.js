const escapeHtml = value => String(value || '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#039;');

const cleanMessage = record => String(record.bodyText || record.message || 'Ada pembaruan penting pada sistem RIS.')
  .replace(/\n\nBuka RIS:[\s\S]*$/i, '')
  .trim();

const actionUrlFor = (record, config) => {
  const path = String(record.actionPath || (record.payload && record.payload.actionPath) || '').trim();
  if (!path) return '';
  if (/^https?:\/\//i.test(path)) return path;
  return `${config.appBaseUrl}${path.startsWith('/') ? path : `/${path}`}`;
};

const itemMarkup = (record, config) => {
  const actionUrl = actionUrlFor(record, config);
  const actionLabel = (record.payload && record.payload.actionLabel) || 'Buka RIS';
  const button = actionUrl
    ? `<p style="margin:20px 0 0"><a href="${escapeHtml(actionUrl)}" style="display:inline-block;background:#13795b;color:#ffffff;text-decoration:none;padding:11px 18px;border-radius:6px;font-weight:600">${escapeHtml(actionLabel)}</a></p>`
    : '';
  return `<div style="padding:18px 0;border-bottom:1px solid #e5e7eb"><h2 style="font-size:17px;line-height:1.4;margin:0 0 8px;color:#17211d">${escapeHtml(record.subject)}</h2><p style="font-size:14px;line-height:1.65;margin:0;color:#46514c;white-space:pre-line">${escapeHtml(cleanMessage(record))}</p>${button}</div>`;
};

const wrapHtml = (content, config, recipientName) => {
  const greeting = recipientName ? `Halo ${escapeHtml(recipientName)},` : 'Halo,';
  const support = config.supportEmail
    ? ` Butuh bantuan? Hubungi <a href="mailto:${escapeHtml(config.supportEmail)}" style="color:#13795b">${escapeHtml(config.supportEmail)}</a>.`
    : '';
  return `<!doctype html><html><body style="margin:0;background:#f4f7f5;font-family:Arial,Helvetica,sans-serif;color:#17211d"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f4f7f5;padding:28px 12px"><tr><td align="center"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:620px;background:#ffffff;border:1px solid #dfe6e2;border-radius:8px"><tr><td style="padding:22px 28px;border-bottom:4px solid #13795b"><strong style="font-size:18px">${escapeHtml(config.brandName)}</strong></td></tr><tr><td style="padding:26px 28px"><p style="font-size:15px;margin:0 0 8px">${greeting}</p>${content}</td></tr><tr><td style="padding:18px 28px;background:#f8faf9;border-top:1px solid #e5e7eb;font-size:12px;line-height:1.6;color:#68736e">Email ini dikirim otomatis oleh ${escapeHtml(config.brandName)}.${support}</td></tr></table></td></tr></table></body></html>`;
};

const textItem = (record, config) => {
  const actionUrl = actionUrlFor(record, config);
  return [record.subject, cleanMessage(record), actionUrl ? `Buka RIS: ${actionUrl}` : ''].filter(Boolean).join('\n');
};

const renderImmediate = (record, config) => {
  const name = record.payload && record.payload.recipientName;
  return {
    subject: record.subject,
    text: [`Halo${name ? ` ${name}` : ''},`, '', textItem(record, config)].join('\n'),
    html: wrapHtml(itemMarkup(record, config), config, name),
  };
};

const renderDigest = (records, config) => {
  const first = records[0] || {};
  const name = first.payload && first.payload.recipientName;
  const subject = `Ringkasan aktivitas RIS (${records.length})`;
  const introduction = '<p style="font-size:14px;line-height:1.65;margin:0;color:#46514c">Berikut aktivitas yang memerlukan perhatian Anda.</p>';
  return {
    subject,
    text: [`Halo${name ? ` ${name}` : ''},`, '', 'Berikut aktivitas yang memerlukan perhatian Anda.', '', ...records.map(record => textItem(record, config))].join('\n\n'),
    html: wrapHtml(`${introduction}${records.map(record => itemMarkup(record, config)).join('')}`, config, name),
  };
};

module.exports = {
  escapeHtml,
  renderImmediate,
  renderDigest,
};
