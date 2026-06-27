/* eslint-disable object-curly-newline, object-property-newline, no-multiple-empty-lines, prefer-destructuring, no-use-before-define, react/prop-types */
import React, { useState } from 'react';
import { useHistory, useParams } from 'react-router-dom';
import { useRis } from '../RisContext';
import { Button, FileDrop, PageBack } from '../components/Ui';
import { fileMeta, formatDate } from '../data';
import { canSignContract } from '../workflow';

export default function ContractPage() {
  const { draftId } = useParams();
  const { data, setData, user } = useRis();
  const history = useHistory();
  const draft = data.drafts.find(item => item.id === draftId);
  const [file, setFile] = useState(null);
  const [error, setError] = useState('');
  if (!draft) return <div className="ris-page"><h1>Pengajuan tidak ditemukan</h1></div>;
  if (!canSignContract(draft, user)) return <div className="ris-page"><h1>Kontrak belum dapat diakses</h1></div>;
  const contract = draft.contract || { status: 'unsigned', templateName: 'template-kontrak.pdf' };

  const download = () => {
    const blob = new Blob(['Template Kontrak Penelitian RIS\n\nJudul: ', draft.project.title], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob); const anchor = document.createElement('a'); anchor.href = url; anchor.download = contract.templateName; anchor.click(); URL.revokeObjectURL(url);
  };
  const submit = () => {
    if (!file) { setError('Pilih file kontrak yang sudah ditandatangani.'); return; }
    const signedFile = fileMeta(file);
    setData(current => ({
      ...current,
      drafts: current.drafts.map(item => (item.id === draft.id ? {
        ...item,
        contract: {
          ...contract, status: 'signed', contractStatus: 'signed', signedFile, signedContractFile: signedFile, uploadedBy: user.id, signedAt: new Date().toISOString()
        }
      } : item))
    }));
    setFile(null); setError('');
  };

  return <div className="ris-page"><PageBack onClick={() => history.push('/ris')} /><h1>Form Pengumpulan Kontrak</h1><p className="ris-muted">{draft.project.title}</p><hr /><p>Silahkan unduh file kontrak di bawah ini, tanda tangani, lalu upload kembali pada bagian Upload Kontrak.</p><Button type="button" tone="blue" pill onClick={download}>Unduh File Kontrak</Button>
    {contract.status === 'signed' && <div className="ris-alert ris-alert-success"><strong>Kontrak sudah ditandatangani.</strong><span>File: {contract.signedFile.name} · {(contract.signedFile.size / 1048576).toFixed(1)} MB</span><small>Ditandatangani: {formatDate(contract.signedAt)}</small></div>}
    <section className="ris-form-section ris-contract-upload"><div className="ris-section-title"><h2>Upload Kontrak dengan Tanda Tangan</h2><Button type="button" tone="gray" pill onClick={() => { setFile(null); setError(''); }}>Reset</Button></div><FileDrop file={file} accept=".pdf" onFile={setFile} label="PDF (.pdf, maksimal 10 MB)" />{error && <p className="ris-inline-error">{error}</p>}<div className="ris-centered"><Button type="button" className="ris-wide-button" disabled={!file} onClick={submit}>SIMPAN</Button></div></section>
  </div>;
}
