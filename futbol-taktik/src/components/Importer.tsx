import { useRef, useState } from 'react';
import { Btn, copyText, Field } from '../ui';

/** Dosya seçme veya yapıştırma ile CSV içe aktarma kutusu; şablon kopyalanabilir. */
export function Importer({ template, onImport, help, id }: { template: string; onImport: (text: string) => void; help?: React.ReactNode; id: string }) {
  const [text, setText] = useState('');
  const tplRef = useRef<HTMLPreElement>(null);
  const read = (f?: File) => {
    if (!f) return;
    const r = new FileReader();
    r.onload = () => setText(String(r.result ?? ''));
    r.readAsText(f, 'utf-8');
  };
  return (
    <div className="importer" onDragOver={(e) => e.preventDefault()} onDrop={(e) => (e.preventDefault(), read(e.dataTransfer.files[0]))}>
      {help}
      <details>
        <summary>Şablonu göster</summary>
        <pre ref={tplRef} className="tpl">
          {template}
        </pre>
        <Btn size="sm" icon="copy" onClick={() => copyText(template, tplRef.current)}>
          Şablonu kopyala
        </Btn>
      </details>
      <div className="row">
        <label className="btn btn-plain btn-md file-btn">
          <input id={id + '-file'} type="file" accept=".csv,.txt,.tsv" onChange={(e) => read(e.target.files?.[0])} />
          <span>CSV dosyası seç</span>
        </label>
        <span className="muted">veya Excel’den kopyalayıp aşağı yapıştırın</span>
      </div>
      <Field label="Veri">
        <textarea id={id + '-text'} rows={6} value={text} onChange={(e) => setText(e.target.value)} placeholder={template.split('\n')[0]} className="mono" />
      </Field>
      <Btn
        variant="primary"
        icon="upload"
        disabled={!text.trim()}
        onClick={() => {
          onImport(text);
          setText('');
        }}
      >
        İçe aktar
      </Btn>
    </div>
  );
}
