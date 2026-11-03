import { useState } from 'react';
import { host } from '../host';
import { Btn, Field, Modal } from '../ui';

/** Kendi sunucusunda: antrenör şifresiyle düzenleme yetkisi (şifre bu cihazda hatırlanır) */
export function CoachLogin({ onClose }: { onClose: () => void }) {
  const [pw, setPw] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const ok = await (host()?.login?.(pw) ?? Promise.resolve(false)).catch(() => false);
    setBusy(false);
    if (ok) location.reload();
    else setErr('Şifre yanlış ya da sunucuya ulaşılamıyor.');
  };
  return (
    <Modal title="Antrenör girişi" onClose={onClose}>
      <form className="stack" onSubmit={submit}>
        <p className="muted">Düzenleme için sunucuyu kuran kişinin belirlediği antrenör şifresini girin. Şifre bu cihazda hatırlanır; oyuncular şifresiz yalnızca görüntüler.</p>
        <Field label="Antrenör şifresi">
          <input id="coach-pw" type="password" autoComplete="current-password" autoFocus value={pw} onChange={(e) => setPw(e.target.value)} />
        </Field>
        {err && <p className="tone-warn small">{err}</p>}
        <div className="row">
          <Btn variant="primary" type="submit" disabled={!pw || busy}>
            Giriş yap
          </Btn>
        </div>
      </form>
    </Modal>
  );
}
