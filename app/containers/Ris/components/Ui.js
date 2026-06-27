/* eslint-disable object-curly-newline, object-property-newline, no-multiple-empty-lines, prefer-destructuring, no-use-before-define, react/prop-types */
import React from 'react';
import PropTypes from 'prop-types';
import Icon from './Icon';

export function Field({
  label, required, children, alignStart
}) {
  return (
    <div className={`ris-field ${alignStart ? 'ris-field-start' : ''}`}>
      <label>{label}{required && <span className="ris-required"> *</span>}</label>
      <div className="ris-field-control">{children}</div>
    </div>
  );
}

Field.propTypes = {
  label: PropTypes.string.isRequired, required: PropTypes.bool, children: PropTypes.node.isRequired, alignStart: PropTypes.bool
};
Field.defaultProps = { required: false, alignStart: false };

export function Button({
  children, tone, pill, className, ...props
}) {
  const classes = ['ris-button', `ris-button-${tone}`, pill ? 'ris-pill' : '', className].filter(Boolean).join(' ');
  return <button type="button" className={classes} {...props}>{children}</button>;
}

Button.propTypes = {
  children: PropTypes.node.isRequired, tone: PropTypes.string, pill: PropTypes.bool, className: PropTypes.string
};
Button.defaultProps = { tone: 'green', pill: false, className: '' };

export function PageBack({ onClick }) {
  return <button type="button" className="ris-back" onClick={onClick} aria-label="Kembali"><Icon name="back" /></button>;
}

PageBack.propTypes = { onClick: PropTypes.func.isRequired };

export function Modal({
  title, children, onClose, width
}) {
  return (
    <div className="ris-modal-backdrop" role="presentation" onMouseDown={onClose}>
      <div className="ris-modal" style={{ maxWidth: width }} role="dialog" aria-modal="true" onMouseDown={event => event.stopPropagation()}>
        <div className="ris-modal-head"><h3>{title}</h3><button type="button" onClick={onClose} aria-label="Tutup"><Icon name="close" /></button></div>
        {children}
      </div>
    </div>
  );
}

Modal.propTypes = {
  title: PropTypes.string.isRequired, children: PropTypes.node.isRequired, onClose: PropTypes.func.isRequired, width: PropTypes.number
};
Modal.defaultProps = { width: 560 };

export function FileDrop({
  file, accept, onFile, label
}) {
  const inputRef = React.useRef(null);
  const openPicker = () => {
    if (inputRef.current) inputRef.current.click();
  };
  const handleDrop = event => {
    event.preventDefault();
    if (event.dataTransfer.files[0]) onFile(event.dataTransfer.files[0]);
  };
  const handleKeyDown = event => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      openPicker();
    }
  };
  return (
    <div>
      <div className="ris-file-drop" role="button" tabIndex={0} onClick={openPicker} onKeyDown={handleKeyDown} onDragOver={event => event.preventDefault()} onDrop={handleDrop}>
        <strong>{label}</strong><span>Drag and Drop Files Here</span>
        <input ref={inputRef} type="file" accept={accept} hidden onChange={event => onFile(event.target.files[0])} />
      </div>
      <div className="ris-file-meta"><span>Nama File</span><b>{file ? file.name : ''}</b></div>
      <div className="ris-file-meta"><span>Ukuran File</span><b>{file ? `${(file.size / 1048576).toFixed(1)} MB` : ''}</b></div>
    </div>
  );
}

FileDrop.propTypes = {
  file: PropTypes.object, accept: PropTypes.string, onFile: PropTypes.func.isRequired, label: PropTypes.string
};
FileDrop.defaultProps = { file: null, accept: '', label: 'Pilih file atau tarik ke area ini' };

export function EmptyRow({ colSpan, children }) {
  return <tr><td className="ris-empty" colSpan={colSpan}>{children}</td></tr>;
}

EmptyRow.propTypes = { colSpan: PropTypes.number.isRequired, children: PropTypes.node.isRequired };
