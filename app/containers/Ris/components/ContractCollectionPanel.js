/* eslint-disable object-curly-newline, object-property-newline, react/prop-types */
import React, { useState } from 'react';
import { useRis } from '../RisContext';
import { fileMeta, formatDate } from '../data';
import { Button, FileDrop, StatusBadge } from './Ui';

export default function ContractCollectionPanel({ draft, readOnly }) {
  const { setData, user } = useRis();
  const [file, setFile] = useState(null);
  const [error, setError] = useState('');
  const contract = draft.contract || { status: 'unsigned', templateName: 'template-kontrak.pdf' };
  const signed = contract.status === 'signed' || contract.contractStatus === 'signed';

  const download = () => {
    const content = `Template Kontrak Penelitian RIS\n\nJudul: ${(draft.project && draft.project.title) || '-'}`;
    const blob = new Blob([content], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = contract.templateName || 'template-kontrak.pdf';
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const submit = () => {
    if (!file) {
      setError('Pilih file kontrak yang sudah ditandatangani.');
      return;
    }
    const signedFile = fileMeta(file);
    const signedAt = new Date().toISOString();
    setData(current => ({
      ...current,
      drafts: current.drafts.map(item => (item.id === draft.id ? {
        ...item,
        contract: {
          ...contract,
          status: 'signed',
          contractStatus: 'signed',
          signedFile,
          signedContractFile: signedFile,
          uploadedBy: user.id,
          signedAt,
        },
      } : item)),
    }));
    setFile(null);
    setError('');
  };

  return (
    <section className="ris-scheme-data-panel">
      <div className="ris-section-title">
        <div><h2>Pengumpulan Kontrak untuk Tanda Tangan</h2><p className="ris-muted">{readOnly ? 'Status dan dokumen kontrak yang dikumpulkan oleh ketua penelitian.' : 'Unduh kontrak, tanda tangani dokumen, lalu unggah kembali dalam format PDF.'}</p></div>
        <StatusBadge tone={signed ? 'green' : 'yellow'}>{signed ? 'Kontrak Ditandatangani' : 'Menunggu Tanda Tangan'}</StatusBadge>
      </div>
      <div className="ris-contract-instruction">
        <div><strong>Template kontrak penelitian</strong><span>{contract.templateName || 'template-kontrak.pdf'}</span></div>
        <Button type="button" tone="blue" onClick={download}>Unduh Kontrak</Button>
      </div>
      {signed && <div className="ris-alert ris-alert-success"><strong>Kontrak sudah dikumpulkan.</strong><span>Berkas: {(contract.signedFile && contract.signedFile.name) || '-'}</span><small>Ditandatangani: {formatDate(contract.signedAt)}</small></div>}
      {!readOnly && <div className="ris-contract-upload-area">
        <div className="ris-section-title"><div><h3>{signed ? 'Perbarui Kontrak' : 'Unggah Kontrak Bertanda Tangan'}</h3><p className="ris-muted">PDF maksimal 10 MB.</p></div>{file && <Button tone="gray" onClick={() => { setFile(null); setError(''); }}>Atur Ulang</Button>}</div>
        <FileDrop file={file} accept=".pdf" maxSize={10 * 1024 * 1024} onError={setError} onFile={setFile} label="Pilih kontrak bertanda tangan" />
        {error && <p className="ris-inline-error">{error}</p>}
        <div className="ris-panel-actions"><Button disabled={!file} onClick={submit}>{signed ? 'Simpan Perubahan' : 'Simpan Kontrak'}</Button></div>
      </div>}
      {readOnly && !signed && <div className="ris-empty-state">Ketua penelitian belum mengunggah kontrak bertanda tangan.</div>}
    </section>
  );
}

ContractCollectionPanel.defaultProps = { readOnly: false };
