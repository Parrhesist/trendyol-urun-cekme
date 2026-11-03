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

/** İlk kurulum (paylaşımlı hosting): antrenör şifresi belirlenir; o andan sonra şifresizler yalnızca görüntüler */
export function CoachSetup({ onClose }: { onClose: () => void }) {
  const [pw, setPw] = useState('');
  const [pw2, setPw2] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if ([...pw].length < 6) return setErr('Şifre en az 6 karakter olmalı.');
    if (pw !== pw2) return setErr('İki şifre aynı değil.');
    setBusy(true);
    try {
      await host()?.setup?.(pw);
      location.reload();
    } catch (x) {
      setErr(x instanceof Error && x.message ? x.message : 'Şifre kaydedilemedi.');
      setBusy(false);
    }
  };
  return (
    <Modal title="İlk kurulum: antrenör şifresi" onClose={onClose}>
      <form className="stack" onSubmit={submit}>
        <p className="muted">
          Bu sunucuda henüz antrenör şifresi yok; şu an adresi bilen herkes verileri değiştirebilir. Bir şifre belirleyin: siz bu cihazda giriş yapmış kalırsınız, oyuncular ve TV şifresiz yalnızca görüntüler.
        </p>
        <Field label="Antrenör şifresi (en az 6 karakter)">
          <input id="setup-pw" type="password" autoComplete="new-password" autoFocus value={pw} onChange={(e) => setPw(e.target.value)} />
        </Field>
        <Field label="Şifre (tekrar)">
          <input id="setup-pw2" type="password" autoComplete="new-password" value={pw2} onChange={(e) => setPw2(e.target.value)} />
        </Field>
        {err && <p className="tone-warn small">{err}</p>}
        <div className="row">
          <Btn variant="primary" type="submit" disabled={!pw || !pw2 || busy}>
            Şifreyi belirle
          </Btn>
          <Btn variant="ghost" onClick={onClose}>
            Şimdi değil
          </Btn>
        </div>
      </form>
    </Modal>
  );
}
