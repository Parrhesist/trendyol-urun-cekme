import { useRef, useState } from 'react';
import { Importer } from '../components/Importer';
import { LinkBox } from '../present/Actions';
import { appBase, linkFor, SCREEN_HASH } from '../present/links';
import { buildSample } from '../sample';
import { DEFAULT_SETTINGS, useStore } from '../store';
import type { LabelMode, TeamData } from '../types';
import { Btn, ConfirmBtn, copyText, Field } from '../ui';

export function SettingsView() {
  const { data, mode, canEdit, saveSettings, replaceAll, toast } = useStore();
  const [s, setS] = useState(data.settings);
  const [backup, setBackup] = useState('');
  const pre = useRef<HTMLTextAreaElement>(null);
  if (!canEdit)
    return (
      <div className="page">
        <h1>Ayarlar</h1>
        <p className="muted">Bu sayfayı yalnızca antrenör değiştirebilir.</p>
      </div>
    );
  return (
    <div className="page narrow">
      <header className="page-head">
        <div>
          <p className="eyebrow">{mode === 'shared' ? 'Paylaşılan veri — oyuncular aynı veriyi görür' : 'Veriler bu cihazda'}</p>
          <h1>Ayarlar</h1>
        </div>
      </header>
      <section className="panel">
        <h2 className="section-title">Takım</h2>
        <div className="form-grid">
          <Field label="Takım adı">
            <input id="st-name" value={s.teamName} onChange={(e) => setS({ ...s, teamName: e.target.value })} />
          </Field>
          <Field label="Kısa ad (skor tabelası)">
            <input id="st-short" value={s.shortName} maxLength={4} onChange={(e) => setS({ ...s, shortName: e.target.value.toLocaleUpperCase('tr-TR') })} />
          </Field>
          <Field label="Forma rengi">
            <input id="st-home" type="color" value={s.homeColor} onChange={(e) => setS({ ...s, homeColor: e.target.value })} />
          </Field>
          <Field label="Rakip rengi">
            <input id="st-away" type="color" value={s.awayColor} onChange={(e) => setS({ ...s, awayColor: e.target.value })} />
          </Field>
          <Field label="Taktik tahtasında oyuncu etiketi" wide>
            <select id="st-labels" value={s.labels ?? (s.showNames ? 'name' : 'role')} onChange={(e) => setS({ ...s, labels: e.target.value as LabelMode })}>
              <option value="num">Yalnız forma numarası</option>
              <option value="role">Mevki (sahadaki konuma göre)</option>
              <option value="name">Soyad</option>
              <option value="both">Mevki ve soyad</option>
            </select>
          </Field>
        </div>
        <Btn
          variant="primary"
          onClick={() => {
            saveSettings(s);
            toast('Ayarlar kaydedildi');
          }}
        >
          Kaydet
        </Btn>
      </section>

      <section className="panel">
        <h2 className="section-title">TV ve ekranlar</h2>
        <p className="muted">
          Soyunma odası veya tesis TV'sinde bu bağlantıyı bir kez açıp bırakın. Taktik, maç ve antrenman sunumlarını tabletten <strong>Ekrana yansıt → TV'ye gönder</strong> ile oraya gönderirsiniz; slaytlar, taktik adımları ve süreler tabletle birlikte ilerler.
        </p>
        <LinkBox link={linkFor(s, SCREEN_HASH)} id="st-screen-link" />
        <ul className="tv-howto">
          <li>
            <strong>Samsung, LG, Android TV tarayıcısı:</strong> bağlantıyı açın, claude.ai'ye uygulamayı açabilen bir hesapla giriş yapın, yer imlerine ekleyin. Kumandada ← → slayt, ↑ ↓ taktik adımı, OK oynat.
          </li>
          <li>
            <strong>Chromecast / Google TV:</strong> bilgisayarda Chrome ile bağlantıyı açın → ⋮ menü → Yayınla → TV'yi seçin.
          </li>
          <li>
            <strong>Apple TV / AirPlay:</strong> iPad'de Denetim Merkezi → Ekran Yansıtma, sonra uygulamada Ekrana yansıt → Tam ekran başlat. TV'de giriş gerekmez.
          </li>
          <li>
            <strong>HDMI kablosu:</strong> bilgisayarı TV'ye bağlayın, bağlantıyı yeni bir pencerede açıp TV ekranına taşıyın.
          </li>
        </ul>
        <Field label="Uygulama bağlantısı" hint="TV, sunum ve paylaşım bağlantıları bu adresle oluşturulur. Boş bırakılırsa otomatik bulunur.">
          <input id="st-appurl" value={s.appUrl ?? ''} placeholder={appBase({}) || 'https://claude.ai/artifact/…'} onChange={(e) => setS({ ...s, appUrl: e.target.value })} />
        </Field>
        <Btn
          variant="primary"
          onClick={() => {
            saveSettings(s);
            toast('Ayarlar kaydedildi');
          }}
        >
          Kaydet
        </Btn>
      </section>

      <section className="panel">
        <h2 className="section-title">Yedekleme</h2>
        <p className="muted">Tüm verileri (kadro, taktikler, antrenmanlar, maçlar) JSON metni olarak kopyalayıp saklayabilir, başka bir kopyaya aktarabilirsiniz.</p>
        <div className="row">
          <Btn
            icon="copy"
            onClick={async () => {
              const txt = JSON.stringify(data);
              setBackup(txt);
              const ok = await copyText(txt);
              toast(ok ? 'Yedek panoya kopyalandı' : 'Yedek aşağıda; seçip kopyalayın');
            }}
          >
            Yedeği kopyala
          </Btn>
        </div>
        {backup && <textarea id="st-backup" ref={pre} className="mono" rows={4} readOnly value={backup} onFocus={(e) => e.target.select()} />}
        <h3>Yedekten geri yükle</h3>
        <Importer
          id="imp-backup"
          template={'{"settings":{…},"players":[…],"tactics":[…],"drills":[…],"sessions":[…],"matches":[…]}'}
          onImport={async (text) => {
            try {
              const d = JSON.parse(text) as TeamData;
              if (!Array.isArray(d.players) || !Array.isArray(d.tactics)) throw new Error();
              await replaceAll({ settings: { ...DEFAULT_SETTINGS, ...d.settings }, players: d.players, tactics: d.tactics, drills: d.drills ?? [], sessions: d.sessions ?? [], matches: d.matches ?? [] });
              setS({ ...DEFAULT_SETTINGS, ...d.settings });
              toast('Yedek geri yüklendi');
            } catch {
              toast('Geçerli bir yedek metni değil', 'err');
            }
          }}
        />
      </section>

      <section className="panel danger-zone">
        <h2 className="section-title">Veriyi sıfırla</h2>
        <p className="muted">Örnek veriler uygulamayı tanımanız içindir. Kendi takımınıza geçerken tümünü silin.</p>
        <div className="row">
          <ConfirmBtn
            onConfirm={async () => {
              const d = buildSample();
              await replaceAll(d);
              setS(d.settings);
              toast('Örnek veriler yüklendi');
            }}
            label="Mevcut veriler silinecek — onayla"
          >
            Örnek verileri yükle
          </ConfirmBtn>
          <ConfirmBtn
            variant="danger"
            onConfirm={async () => {
              const d: TeamData = { settings: { ...DEFAULT_SETTINGS, teamName: s.teamName, shortName: s.shortName }, players: [], tactics: [], drills: [], sessions: [], matches: [] };
              await replaceAll(d);
              setS(d.settings);
              toast('Tüm veriler silindi');
            }}
            label="Geri alınamaz — onayla"
          >
            Tüm verileri sil
          </ConfirmBtn>
        </div>
      </section>
    </div>
  );
}
