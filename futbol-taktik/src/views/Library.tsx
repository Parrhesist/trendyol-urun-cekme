import { useMemo, useState } from 'react';
import { MiniPitch } from '../components/Pitch';
import { TacticPlayer } from '../components/TacticPlayer';
import { fmtDate, todayISO } from '../football';
import { forkLib, LIB_GROUPS, LIBRARY, libItem, searchLib, type LibItem } from '../library';
import type { LibGroup } from '../library/dsl';
import { adaptTactic } from '../lineup';
import { PresentActions } from '../present/Actions';
import { useStore } from '../store';
import { isPlayed } from '../stats';
import { Btn, Empty, Icon, Modal, Segmented } from '../ui';

/** Taktik sayfasının iki sekmesi: kullanıcının taktikleri ve hazır kütüphane */
export function TacticTabs({ active, mine }: { active: 'mine' | 'lib'; mine: number }) {
  return (
    <nav className="tabs-links" aria-label="Taktik bölümleri">
      <a href="#taktik" className={active === 'mine' ? 'on' : ''} aria-current={active === 'mine' ? 'page' : undefined}>
        Taktiklerim <span className="tabnum">{mine}</span>
      </a>
      <a href="#kutuphane" className={active === 'lib' ? 'on' : ''} aria-current={active === 'lib' ? 'page' : undefined}>
        Hazır taktikler <span className="tabnum">{LIBRARY.length}</span>
      </a>
    </nav>
  );
}

// Detaydan listeye dönünce arama ve filtre korunur
const listState: { q: string; group: LibGroup | 'Tümü' } = { q: '', group: 'Tümü' };

export function Library({ openId, onOpen, onOpenTactic }: { openId?: string; onOpen: (id: string | null) => void; onOpenTactic: (id: string) => void }) {
  const it = openId ? libItem(openId) : undefined;
  if (openId && it) return <LibraryDetail key={it.def.id} it={it} onBack={() => onOpen(null)} onOpenTactic={onOpenTactic} />;
  return <LibraryList onOpen={onOpen} />;
}

function LibraryList({ onOpen }: { onOpen: (id: string) => void }) {
  const { data } = useStore();
  const [q, setQ] = useState(listState.q);
  const [group, setGroup] = useState<LibGroup | 'Tümü'>(listState.group);
  listState.q = q;
  listState.group = group;
  const list = useMemo(() => searchLib(q, group), [q, group]);
  const counts = useMemo(() => Object.fromEntries(LIB_GROUPS.map((g) => [g, LIBRARY.filter((x) => x.def.group === g).length])), []);
  const copied = new Set(data.tactics.map((t) => t.libId).filter(Boolean));
  const colors = { home: data.settings.homeColor, away: data.settings.awayColor };
  return (
    <div className="page">
      <header className="page-head">
        <div>
          <p className="eyebrow">{LIBRARY.length} animasyonlu taktik · kaynaklarıyla</p>
          <h1>Hazır Taktikler</h1>
        </div>
        <TacticTabs active="lib" mine={data.tactics.length} />
      </header>
      <p className="muted lib-intro">
        Antrenörlük eğitimlerinde ve taktik literatüründe yer alan sistemler, oyun kurma yolları, hücum kalıpları, pres türleri, geçişler ve duran toplar. Her biri adım adım anlatımlı. Birini açıp <strong>Düzenle ve kaydet</strong> derseniz kendi kopyanız oluşur; anlatımı, adımları ve çizimleri istediğiniz gibi değiştirebilirsiniz.
      </p>
      <div className="lib-filters">
        <label className="search">
          <Icon name="search" />
          <input id="lib-q" type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Ara: pres, bindirme, korner, Guardiola, 3-5-2…" aria-label="Kütüphanede ara" />
        </label>
        <Segmented
          id="lib-group"
          value={group}
          onChange={setGroup}
          options={[{ value: 'Tümü' as const, label: `Tümü ${LIBRARY.length}` }, ...LIB_GROUPS.map((g) => ({ value: g, label: `${g} ${counts[g]}` }))]}
        />
      </div>
      {list.length === 0 ? (
        <Empty title="Sonuç yok">Farklı bir kelime deneyin ya da grubu “Tümü” yapın.</Empty>
      ) : (
        <div className="card-grid">
          {list.map(({ def, tactic }) => {
            const f = tactic.frames[Math.min(1, tactic.frames.length - 1)];
            return (
              <button key={def.id} type="button" className="tcard lib-card" onClick={() => onOpen(def.id)}>
                <MiniPitch tokens={tactic.tokens} pos={f.pos} drawings={f.drawings} half={tactic.half} colors={colors} tokenScale={tactic.tokenScale} />
                <div className="tcard-body">
                  <span className="cat">
                    {def.group}
                    {copied.has(def.id) && <span className="lib-badge">Kopyanız var</span>}
                  </span>
                  <strong>{def.name}</strong>
                  <small>{def.src.split(/[.;—]/)[0]}</small>
                  <small className="tabnum">{tactic.frames.length - 1} adım</small>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function LibraryDetail({ it, onBack, onOpenTactic }: { it: LibItem; onBack: () => void; onOpenTactic: (id: string) => void }) {
  const { data, save, canEdit, toast } = useStore();
  const [step, setStep] = useState(0);
  const [play, setPlay] = useState(0);
  const [picking, setPicking] = useState(false);
  const { def, tactic } = it;
  const copies = data.tactics.filter((t) => t.libId === def.id && !t.matchId);

  const fork = async () => {
    const t = forkLib(it);
    if (copies.length) t.name = `${t.name} (${copies.length + 1})`;
    await save('tactics', t);
    toast('Kopyanız oluşturuldu: değiştirip kaydedebilirsiniz');
    onOpenTactic(t.id);
  };

  return (
    <div className="page">
      <header className="lib-head">
        <Btn variant="ghost" icon="prev" onClick={onBack}>
          Hazır taktikler
        </Btn>
        <div className="lib-title">
          <p className="eyebrow">
            {def.group} · {def.cat}
          </p>
          <h1>{def.name}</h1>
        </div>
        <div className="row">
          {canEdit && (
            <Btn variant="primary" icon="edit" size="lg" onClick={fork}>
              Düzenle ve kaydet
            </Btn>
          )}
          <PresentActions target={{ kind: 'kutup', id: def.id }} size="lg" />
          {canEdit && (
            <Btn icon="whistle" size="lg" onClick={() => setPicking(true)}>
              Maça ekle
            </Btn>
          )}
        </div>
      </header>
      {copies.length > 0 && (
        <p className="hint">
          Bu taktiğin kopyaları:{' '}
          {copies.map((c, i) => (
            <span key={c.id}>
              {i > 0 && ', '}
              <a href={'#taktik-' + c.id}>{c.name}</a>
            </span>
          ))}
          . Orijinal hep burada kalır.
        </p>
      )}
      <div className="lib-detail">
        <section className="panel">
          <TacticPlayer
            tactic={tactic}
            big
            step={step}
            play={play}
            onStep={setStep}
            onPlay={() => {
              setStep(0);
              setPlay((p) => p + 1);
            }}
          />
        </section>
        <aside className="panel lib-side">
          <h2 className="section-title">Anlatım</h2>
          <p>{def.desc}</p>
          <h2 className="section-title">Adım adım</h2>
          <ol className="lib-steps">
            {tactic.frames.map((f, i) => (
              <li key={i}>
                <button type="button" className={i === step ? 'on' : ''} onClick={() => setStep(i)}>
                  <span className="tabnum">{i === 0 ? 'Başlangıç' : i}</span>
                  <span>{f.note}</span>
                </button>
              </li>
            ))}
          </ol>
          <h2 className="section-title">Koçluk noktaları</h2>
          <ul className="points">
            {def.pts.map((x) => (
              <li key={x}>{x}</li>
            ))}
          </ul>
          <h2 className="section-title">Kaynak</h2>
          <p className="small muted">{def.src}</p>
          {def.tags && (
            <div className="chips">
              {def.tags.map((t) => (
                <span key={t} className="chip static">
                  {t}
                </span>
              ))}
            </div>
          )}
        </aside>
      </div>
      {picking && <AddToMatch it={it} onClose={() => setPicking(false)} />}
    </div>
  );
}

/** Kütüphane taktiğini bir maçın kadrosuna uyarlayıp o maçın taktiklerine ekler */
function AddToMatch({ it, onClose }: { it: LibItem; onClose: () => void }) {
  const { data, save, toast } = useStore();
  const today = todayISO();
  const matches = [...data.matches].sort((a, b) => {
    const ua = !isPlayed(a) && a.date >= today;
    const ub = !isPlayed(b) && b.date >= today;
    return ua !== ub ? (ua ? -1 : 1) : ua ? a.date.localeCompare(b.date) : b.date.localeCompare(a.date);
  });
  return (
    <Modal title="Maça ekle" onClose={onClose}>
      <p className="muted">Taktiğin bir kopyası seçtiğiniz maçın kadrosuyla eşleştirilir (oyuncular konumlarına göre) ve maç taktiklerine eklenir.</p>
      {matches.length === 0 && <p>Önce bir maç oluşturun.</p>}
      <ul className="sq-list">
        {matches.map((m) => (
          <li key={m.id} className="sq-row">
            <button
              type="button"
              className="sq-main"
              onClick={async () => {
                const t = adaptTactic(it.tactic, m, data.players);
                await save('tactics', t);
                await save('matches', { ...m, pre: { ...m.pre, tacticIds: [...m.pre.tacticIds, t.id] } });
                toast(`${m.opponent || 'Maç'} maçına eklendi`);
                onClose();
              }}
            >
              <span className="sq-name">
                <strong>{m.opponent || 'Rakip belirlenmedi'}</strong>
                <small>
                  {fmtDate(m.date, { day: 'numeric', month: 'long' })} · {isPlayed(m) ? 'oynandı' : 'yaklaşan'} · {m.pre.tacticIds.length} taktik
                </small>
              </span>
              <Icon name="plus" />
            </button>
          </li>
        ))}
      </ul>
    </Modal>
  );
}

/** Maç taktikleri seçicisinde kullanılan kütüphane listesi */
export function LibraryPicker({ onPick }: { onPick: (it: LibItem) => void }) {
  const { data } = useStore();
  const [q, setQ] = useState('');
  const [group, setGroup] = useState<LibGroup | 'Tümü'>('Tümü');
  const list = useMemo(() => searchLib(q, group).filter((x) => x.def.group !== 'Sistemler'), [q, group]);
  const colors = { home: data.settings.homeColor, away: data.settings.awayColor };
  return (
    <div className="stack">
      <div className="lib-filters">
        <label className="search">
          <Icon name="search" />
          <input id="libp-q" type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Ara…" aria-label="Hazır taktiklerde ara" />
        </label>
        <select id="libp-group" value={group} onChange={(e) => setGroup(e.target.value as LibGroup | 'Tümü')} aria-label="Grup">
          <option value="Tümü">Tüm gruplar</option>
          {LIB_GROUPS.filter((g) => g !== 'Sistemler').map((g) => (
            <option key={g}>{g}</option>
          ))}
        </select>
      </div>
      <div className="pick-tactics">
        {list.map((x) => (
          <div key={x.def.id} className="pick-t">
            <MiniPitch tokens={x.tactic.tokens} pos={x.tactic.frames[0].pos} drawings={x.tactic.frames[Math.min(1, x.tactic.frames.length - 1)].drawings} half={x.tactic.half} colors={colors} />
            <div className="mt-body">
              <span className="cat">{x.def.group}</span>
              <strong>{x.def.name}</strong>
            </div>
            <Btn size="sm" variant="primary" onClick={() => onPick(x)}>
              Uyarla ve ekle
            </Btn>
          </div>
        ))}
      </div>
    </div>
  );
}
