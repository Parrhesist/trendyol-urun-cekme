import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pitch, MiniPitch, type Tool } from '../components/Pitch';
import { labelModeOf, useTacticAnimation, useTokenLabels } from '../components/TacticPlayer';
import { cloneFrame, FORMATION_NAMES, FORMATIONS, makeTactic, mirror, uid } from '../football';
import { autoLineup, tacticFromMatch } from '../lineup';
import { useStore } from '../store';
import type { Drawing, LabelMode, Pt, Tactic, TacticCategory, Token, TokenKind } from '../types';
import { Btn, ConfirmBtn, Empty, enterFullscreen, exitFullscreen, Field, fullscreenElement, fullscreenHint, Icon, Modal, Segmented, useFullscreen } from '../ui';
import { libItem } from '../library';
import { addDrawing, previewDrawings, removeDrawing } from '../moves';
import { PresentActions } from '../present/Actions';
import { TacticTabs } from './Library';
import { ShareModal } from './Share';

const fmtShort = (iso: string) => new Date(iso + 'T12:00:00').toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' });

const CATEGORIES: TacticCategory[] = ['Sistem', 'Hücum', 'Savunma', 'Geçiş', 'Duran Top', 'Antrenman'];

const TOOLS: { id: Tool; icon: string; label: string }[] = [
  { id: 'move', icon: 'move', label: 'Taşı' },
  { id: 'run', icon: 'run', label: 'Koşu' },
  { id: 'pass', icon: 'pass', label: 'Pas' },
  { id: 'dribble', icon: 'dribble', label: 'Top sürme' },
  { id: 'zone', icon: 'zone', label: 'Bölge' },
  { id: 'line', icon: 'line', label: 'Hat' },
  { id: 'erase', icon: 'eraser', label: 'Sil' },
];

const ADDS: Token['kind'][] = ['home', 'away', 'ball', 'cone', 'goal'];

const LABEL_OPTS: { value: LabelMode; label: string }[] = [
  { value: 'num', label: 'No' },
  { value: 'role', label: 'Mevki' },
  { value: 'name', label: 'İsim' },
  { value: 'both', label: 'İkisi' },
];

export function TacticBoard({ openId, onOpen, backLabel }: { openId?: string; onOpen: (id: string | null) => void; backLabel?: string }) {
  const { data, canEdit } = useStore();
  const [filter, setFilter] = useState<TacticCategory | 'Tümü'>('Tümü');
  const [creating, setCreating] = useState(false);
  const list = useMemo(
    () => [...data.tactics].filter((t) => filter === 'Tümü' || t.category === filter).sort((a, b) => b.updatedAt - a.updatedAt),
    [data.tactics, filter],
  );
  const current = data.tactics.find((t) => t.id === openId);

  if (openId && current) return <Editor key={current.id} tactic={current} onBack={() => onOpen(null)} backLabel={backLabel} />;

  const colors = { home: data.settings.homeColor, away: data.settings.awayColor };
  return (
    <div className="page">
      <header className="page-head">
        <div>
          <p className="eyebrow">Kendi taktikleriniz</p>
          <h1>Taktik Tahtası</h1>
        </div>
        <TacticTabs active="mine" mine={data.tactics.length} />
        {canEdit && (
          <Btn variant="primary" icon="plus" size="lg" onClick={() => setCreating(true)}>
            Yeni taktik
          </Btn>
        )}
      </header>
      <Segmented value={filter} onChange={setFilter} options={(['Tümü', ...CATEGORIES] as const).map((c) => ({ value: c, label: c }))} />
      {list.length === 0 ? (
        <Empty title="Bu kategoride taktik yok">Yeni taktik oluşturup oyuncuları sürükleyerek başlayın.</Empty>
      ) : (
        <div className="card-grid">
          {list.map((t) => (
            <button key={t.id} type="button" className="tcard" onClick={() => onOpen(t.id)}>
              <MiniPitch tokens={t.tokens} pos={t.frames[0].pos} drawings={previewDrawings(t)} half={t.half} colors={colors} />
              <div className="tcard-body">
                <span className={'cat cat-' + CATEGORIES.indexOf(t.category)}>
                  {t.category}
                  {t.libId && <span className="lib-badge">Kütüphaneden</span>}
                </span>
                <strong>{t.name}</strong>
                <small>
                  {t.formation}
                  {t.awayFormation ? ` – ${t.awayFormation}` : ''} · {t.frames.length} adım
                  {t.matchId && data.matches.find((m) => m.id === t.matchId) ? ` · ${data.matches.find((m) => m.id === t.matchId)!.opponent} maçı` : ''}
                </small>
              </div>
            </button>
          ))}
        </div>
      )}
      {creating && (
        <NewTacticModal
          onClose={() => setCreating(false)}
          onCreate={(id) => {
            setCreating(false);
            onOpen(id);
          }}
        />
      )}
    </div>
  );
}

function NewTacticModal({ onClose, onCreate }: { onClose: () => void; onCreate: (id: string) => void }) {
  const { data, save } = useStore();
  const [name, setName] = useState('');
  const [category, setCategory] = useState<TacticCategory>('Hücum');
  const [formation, setFormation] = useState('4-3-3');
  const [away, setAway] = useState<string>('4-4-2');
  const [half, setHalf] = useState(false);
  const [blank, setBlank] = useState(false);
  const [source, setSource] = useState('');
  const sourceMatches = [...data.matches].filter((m) => Object.keys(m.pre.lineup).length).sort((a, b) => b.date.localeCompare(a.date));
  const create = async () => {
    let t: Tactic;
    const sm = data.matches.find((m) => m.id === source);
    if (!blank && sm) {
      t = tacticFromMatch(sm, data.players, { name: name || `${category} — ${sm.opponent}`, category, withOpponent: false, half });
      t.matchId = undefined;
      if (away !== 'yok') {
        const opp = makeTactic('', formation, { away });
        const ids = opp.tokens.filter((k) => k.kind === 'away');
        t.tokens.splice(t.tokens.length - 1, 0, ...ids);
        ids.forEach((k) => (t.frames[0].pos[k.id] = opp.frames[0].pos[k.id]));
        t.awayFormation = away;
      }
    } else if (blank) {
      t = makeTactic(name || 'Yeni diyagram', formation, { category });
      t.tokens = t.tokens.filter((k) => k.kind === 'ball');
      t.frames[0].pos = Object.fromEntries(Object.entries(t.frames[0].pos).filter(([k]) => t.tokens.some((x) => x.id === k)));
    } else {
      const lineup = autoLineup(formation, data.players);
      t = makeTactic(name || `${formation} ${category.toLowerCase()}`, formation, {
        away: away === 'yok' ? null : away,
        lineup,
        numbers: lineup.map((id) => data.players.find((p) => p.id === id)?.number),
        category,
      });
    }
    t.half = half;
    await save('tactics', t);
    onCreate(t.id);
  };
  return (
    <Modal
      title="Yeni taktik"
      onClose={onClose}
      footer={
        <>
          <Btn onClick={onClose}>Vazgeç</Btn>
          <Btn variant="primary" onClick={create}>
            Oluştur
          </Btn>
        </>
      }
    >
      <div className="form-grid">
        <Field label="Ad" wide>
          <input id="nt-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ör. Geniş alanda pres kırma" autoFocus />
        </Field>
        <Field label="Kategori">
          <select id="nt-cat" value={category} onChange={(e) => setCategory(e.target.value as TacticCategory)}>
            {CATEGORIES.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </Field>
        <Field label="Görünüm">
          <select id="nt-half" value={half ? 'yari' : 'tam'} onChange={(e) => setHalf(e.target.value === 'yari')}>
            <option value="tam">Tam saha</option>
            <option value="yari">Yarı saha (hücum yönü)</option>
          </select>
        </Field>
        <Field label="Oyuncular" hint={source ? 'Maçtaki diziliş ve konumlarıyla gelir' : 'Kadrodan mevkiye göre yerleşir'}>
          <select id="nt-src" value={source} onChange={(e) => setSource(e.target.value)} disabled={blank}>
            <option value="">Seçilen dizilişle, otomatik</option>
            {sourceMatches.map((m) => (
              <option key={m.id} value={m.id}>
                {m.opponent || 'Maç'} kadrosu ({fmtShort(m.date)})
              </option>
            ))}
          </select>
        </Field>
        <Field label="Bizim diziliş">
          <select id="nt-form" value={formation} onChange={(e) => setFormation(e.target.value)} disabled={blank || !!source}>
            {FORMATION_NAMES.map((f) => (
              <option key={f}>{f}</option>
            ))}
          </select>
        </Field>
        <Field label="Rakip dizilişi">
          <select id="nt-away" value={away} onChange={(e) => setAway(e.target.value)} disabled={blank}>
            <option value="yok">Rakip yok</option>
            {FORMATION_NAMES.map((f) => (
              <option key={f}>{f}</option>
            ))}
          </select>
        </Field>
        <label className="check wide">
          <input id="nt-blank" type="checkbox" checked={blank} onChange={(e) => setBlank(e.target.checked)} /> Boş saha (antrenman diyagramı için; oyuncuları kendiniz ekleyin)
        </label>
      </div>
    </Modal>
  );
}

function Editor({ tactic, onBack, backLabel }: { tactic: Tactic; onBack: () => void; backLabel?: string }) {
  const { data, save, remove, canEdit, toast, saveSettings } = useStore();
  const [labelMode, setLabelMode] = useState<LabelMode>(labelModeOf(data.settings));
  const [t, setT] = useState<Tactic>(tactic);
  const [tool, setTool] = useState<Tool>('move');
  const [color, setColor] = useState('a');
  const [selected, setSelected] = useState<string | null>(null);
  const [sharing, setSharing] = useState(false);
  const [descOpen, setDescOpen] = useState(false);
  // telefonda ayarlar paneli sahanın üstünde açılır-kapanır çekmece
  const [sideOpen, setSideOpen] = useState(false);
  // ders modu: saha tüm ekranı kaplar, diğer her şey açılır-kapanır yüzer panel
  const [lesson, setLesson] = useState(false);
  const [fsHint, setFsHint] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  const history = useRef<Tactic[]>([]);
  const rootRef = useRef<HTMLDivElement>(null);
  const anim = useTacticAnimation(t);
  const labels = useTokenLabels(t, labelMode, Math.min(anim.fi, t.frames.length - 1));
  const changeLabels = (v: LabelMode) => {
    setLabelMode(v);
    if (canEdit) saveSettings({ ...data.settings, labels: v });
  };
  const fi = Math.min(anim.fi, t.frames.length - 1);
  const frame = t.frames[fi];
  const editable = canEdit && !anim.playing && anim.progress >= 1;
  const colors = { home: data.settings.homeColor, away: data.settings.awayColor };

  // Dışarıdan (başka cihaz) gelen değişiklikler, yerelde kaydedilmemiş düzenleme yoksa uygulanır
  useEffect(() => {
    if (!dirty && tactic.updatedAt > t.updatedAt) setT(tactic);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tactic]);

  const update = useCallback((fn: (d: Tactic) => Tactic, snapshot = true) => {
    setT((prev) => {
      if (snapshot) history.current = [...history.current.slice(-40), prev];
      return { ...fn(prev), updatedAt: Date.now() };
    });
    setDirty(true);
  }, []);

  // Otomatik kayıt
  useEffect(() => {
    if (!dirty || !canEdit) return;
    const h = setTimeout(() => {
      save('tactics', t);
      setDirty(false);
    }, 1200);
    return () => clearTimeout(h);
  }, [t, dirty, canEdit, save]);

  const setFrame = (fn: (f: Tactic['frames'][number]) => Tactic['frames'][number], snapshot = true) =>
    update((d) => ({ ...d, frames: d.frames.map((f, i) => (i === fi ? fn(f) : f)) }), snapshot);

  const moveStart = useRef(false);
  const onMove = (id: string, p: Pt) => {
    if (!moveStart.current) {
      history.current = [...history.current.slice(-40), t];
      moveStart.current = true;
    }
    setFrame((f) => ({ ...f, pos: { ...f.pos, [id]: p } }), false);
  };

  const undo = () => {
    const prev = history.current.pop();
    if (prev) {
      setT({ ...prev, updatedAt: Date.now() });
      setDirty(true);
    }
  };

  const addFrame = () => {
    update((d) => {
      const frames = [...d.frames];
      frames.splice(fi + 1, 0, cloneFrame(d.frames[fi]));
      return { ...d, frames };
    });
    anim.setFi(fi + 1);
  };

  const delFrameAt = (i: number) => {
    if (t.frames.length < 2) return;
    update((d) => ({ ...d, frames: d.frames.filter((_, j) => j !== i) }));
    if (i < fi || (i === fi && fi > 0)) anim.setFi(fi - 1);
    toast(`Adım ${i + 1} silindi. Geri al ile geri getirebilirsiniz.`);
  };

  // koşu, pas ve top sürme oku taşın yanından başlarsa sonraki adımda taş okun ucuna gider
  const drawn = (d: Drawing) => {
    const r = addDrawing(t, fi, d);
    update(() => r.tactic);
    if (r.created) toast(`Adım ${fi + 2} eklendi: Oynat'a basınca ${r.mover === 'ball' ? 'top' : 'oyuncu'} okun ucuna gider.`);
  };

  const addToken = (kind: TokenKind) => {
    const id = uid(kind[0]);
    const count = t.tokens.filter((k) => k.kind === kind).length;
    const label = kind === 'home' || kind === 'away' ? String(count + 1) : '';
    const p: Pt = { x: t.half ? 78 : 52.5, y: 34 + ((count * 4) % 20) - 8 };
    update((d) => ({
      ...d,
      tokens: [...d.tokens, { id, kind, label }],
      frames: d.frames.map((f) => ({ ...f, pos: { ...f.pos, [id]: p } })),
    }));
    setSelected(id);
    setTool('move');
  };

  const delToken = (id: string) => {
    update((d) => ({
      ...d,
      tokens: d.tokens.filter((k) => k.id !== id),
      frames: d.frames.map((f) => {
        const pos = { ...f.pos };
        delete pos[id];
        return { ...f, pos };
      }),
    }));
    setSelected(null);
  };

  const applyFormation = (side: 'home' | 'away', formation: string) => {
    const ids = t.tokens.filter((k) => k.kind === side).map((k) => k.id);
    const slots = FORMATIONS[formation];
    if (ids.length !== slots.length) {
      toast(`Diziliş için ${slots.length} oyuncu gerekli (şu an ${ids.length}).`, 'err');
      return;
    }
    update((d) => ({
      ...d,
      [side === 'home' ? 'formation' : 'awayFormation']: formation,
      frames: d.frames.map((f, i) =>
        i !== fi ? f : { ...f, pos: { ...f.pos, ...Object.fromEntries(ids.map((id, j) => [id, side === 'home' ? { x: slots[j][1], y: slots[j][2] } : mirror({ x: slots[j][1], y: slots[j][2] })])) } },
      ),
    }));
  };

  const selTok = t.tokens.find((k) => k.id === selected);
  const updateTok = (patch: Partial<Token>) => update((d) => ({ ...d, tokens: d.tokens.map((k) => (k.id === selected ? { ...k, ...patch } : k)) }));


  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).closest('input,textarea,select')) return;
      if (e.key === 'ArrowRight') anim.setFi(fi + 1);
      if (e.key === 'ArrowLeft') anim.setFi(fi - 1);
      if (e.key === ' ') {
        e.preventDefault();
        anim.playing ? anim.stop() : anim.play();
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'z') undo();
      if ((e.key === 'Delete' || e.key === 'Backspace') && selected && editable) delToken(selected);
      if (e.key === 'Escape' && lesson) endLesson();
    };
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  });

  const startLesson = async () => {
    setLesson(true);
    setSideOpen(false);
    setSelected(null);
    setFsHint((await enterFullscreen()) ? null : fullscreenHint());
  };
  const endLesson = () => {
    setLesson(false);
    setFsHint(null);
    if (fullscreenElement()) exitFullscreen();
  };

  const players = [...data.players].sort((a, b) => a.number - b.number);

  const kindLabel = (k: Token['kind']) => (k === 'home' ? 'Oyuncu' : k === 'away' ? 'Rakip' : k === 'ball' ? 'Top' : k === 'cone' ? 'Huni' : 'Kale');

  return (
    <div className={'editor ws' + (lesson ? ' lesson' : '') + (sideOpen ? ' side-open' : '') + (selTok && editable ? ' has-sel' : '')} ref={rootRef}>
      <header className="editor-head ws-head">
        <Btn variant="ghost" icon="prev" onClick={onBack} aria-label={backLabel ?? 'Taktiklere dön'}>
          {backLabel}
        </Btn>
        {canEdit ? (
          <input id="tac-name" className="title-input" value={t.name} onChange={(e) => update((d) => ({ ...d, name: e.target.value }), false)} aria-label="Taktik adı" />
        ) : (
          <h1 className="editor-title">{t.name}</h1>
        )}
        <div className="editor-actions">
          <div className="label-switch" title="Oyuncuların üstünde/altında ne yazsın">
            <span className="field-label">Etiket</span>
            <Segmented id="tac-labels" value={labelMode} onChange={changeLabels} options={LABEL_OPTS} />
          </div>
          {canEdit && (
            <span className="save-state" aria-live="polite">
              {dirty ? 'Kaydediliyor…' : 'Kaydedildi'}
            </span>
          )}
          <Btn icon="focus" onClick={startLesson} title="Ders modu: saha tüm ekranı kaplar, araçlar açılır-kapanır">
            <span className="hide-phone">Ders modu</span>
          </Btn>
          <Btn icon="share" onClick={() => setSharing(true)} aria-label="Paylaş">
            <span className="hide-narrow">Paylaş</span>
          </Btn>
          <PresentActions target={{ kind: 'taktik', id: t.id }} size="md" compact />
          <Btn icon="gear" className="phone-only" variant={sideOpen ? 'primary' : 'plain'} onClick={() => setSideOpen((v) => !v)} aria-label="Ayarlar ve anlatım" aria-pressed={sideOpen} />
        </div>
      </header>

      {canEdit && (
        <div className="toolbar ed-tools" role="toolbar" aria-label="Çizim araçları">
          <div className="tool-group tools-main">
            {TOOLS.map((x) => (
              <button key={x.id} type="button" className={'tool' + (tool === x.id ? ' on' : '')} onClick={() => setTool(x.id)} title={x.label}>
                <Icon name={x.icon} size={20} />
                <span>{x.label}</span>
              </button>
            ))}
          </div>
          <div className="tool-group swatches">
            {['a', 'b', 'c', 'd'].map((c) => (
              <button key={c} type="button" className={'swatch' + (color === c ? ' on' : '')} style={{ background: `var(--ink-draw-${c})` }} onClick={() => setColor(c)} aria-label={`Renk ${c}`} />
            ))}
          </div>
          <div className="tool-group adds">
            {ADDS.map((k) => (
              <button key={k} type="button" className="add-tok" onClick={() => addToken(k)} title={kindLabel(k) + ' ekle'} disabled={!editable}>
                <i className={'add-ico ' + k} aria-hidden="true" />
                <span>+ {kindLabel(k)}</span>
              </button>
            ))}
            <Btn size="sm" variant="ghost" icon="undo" onClick={undo} disabled={!editable || !history.current.length} title="Geri al">
              <span className="hide-narrow">Geri al</span>
            </Btn>
          </div>
        </div>
      )}

      <section className="frames ed-frames" aria-label="Adımlar ve oynatma">
        <div className="frames-ctrl">
          <Btn icon={anim.playing ? 'pause' : 'play'} variant="primary" size="lg" onClick={anim.playing ? anim.stop : anim.play} disabled={t.frames.length < 2}>
            {anim.playing ? 'Durdur' : 'Oynat'}
          </Btn>
          <Btn icon="prev" variant="ghost" size="lg" onClick={() => anim.setFi(fi - 1)} disabled={fi === 0} aria-label="Önceki adım" />
          <Btn icon="next" variant="ghost" size="lg" onClick={() => anim.setFi(fi + 1)} disabled={fi >= t.frames.length - 1} aria-label="Sonraki adım" />
        </div>
        <StepChips n={t.frames.length} fi={fi} editable={editable} onGo={anim.setFi} onAdd={addFrame} onDel={delFrameAt} addLabel="+ Adım" />
        <div className="frame-note">
          {editable ? (
            <textarea id="frame-note" rows={2} placeholder={`Adım ${fi + 1} notu: kim, nereye, ne zaman?`} value={frame.note ?? ''} onChange={(e) => setFrame((f) => ({ ...f, note: e.target.value }), false)} />
          ) : (
            <p className="note-read">{frame.note || 'Bu adım için not yok.'}</p>
          )}
        </div>
      </section>

      <div className="board-wrap ed-board pitch-fit">
        <Pitch
          tokens={t.tokens}
          pos={anim.pos}
          drawings={anim.drawings}
          half={t.half}
          colors={colors}
          subFor={labels.subFor}
          roleFor={labels.roleFor}
          tokenScale={t.tokenScale}
          tool={tool}
          color={color}
          editable={editable}
          selected={selected}
          onSelect={setSelected}
          onMove={onMove}
          onMoveEnd={() => (moveStart.current = false)}
          onDraw={drawn}
          onErase={(id) => update((d) => removeDrawing(d, fi, id))}
          className="board"
        />
      </div>

      <aside className="inspector ed-side">
        {selTok && editable ? (
          <section>
            <div className="row between">
              <h3>Seçili: {kindLabel(selTok.kind)}</h3>
              <Btn size="sm" variant="ghost" icon="close" aria-label="Seçimi kaldır" onClick={() => setSelected(null)} />
            </div>
            {labels.roleName(selTok) && (
              <p className="role-line">
                <span className="role-chip">{labels.roleName(selTok)!.split(' · ')[0]}</span> {labels.roleName(selTok)!.split(' · ')[1]}
              </p>
            )}
            {(selTok.kind === 'home' || selTok.kind === 'away') && (
              <Field label="Etiket (forma no / mevki)">
                <input id="tok-label" value={selTok.label} maxLength={4} onChange={(e) => updateTok({ label: e.target.value })} />
              </Field>
            )}
            {selTok.kind === 'home' && (
              <Field label="Kadrodan oyuncu">
                <select
                  id="tok-player"
                  value={selTok.playerId ?? ''}
                  onChange={(e) => {
                    const p = data.players.find((x) => x.id === e.target.value);
                    updateTok({ playerId: p?.id, label: p ? String(p.number) : selTok.label });
                  }}
                >
                  <option value="">—</option>
                  {players.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.number} · {p.name}
                    </option>
                  ))}
                </select>
              </Field>
            )}
            <Btn variant="danger" icon="trash" size="sm" onClick={() => delToken(selTok.id)}>
              Kaldır
            </Btn>
          </section>
        ) : (
          <section>
            <div className="row between">
              <h3>Ayarlar</h3>
              <Btn size="sm" variant="ghost" icon="close" className="phone-only" aria-label="Ayarları kapat" onClick={() => setSideOpen(false)} />
            </div>
            {canEdit ? (
              <div className="side-grid">
                <Field label="Kategori">
                  <select id="tac-cat" value={t.category} onChange={(e) => update((d) => ({ ...d, category: e.target.value as TacticCategory }))}>
                    {CATEGORIES.map((c) => (
                      <option key={c}>{c}</option>
                    ))}
                  </select>
                </Field>
                <Field label="Görünüm">
                  <select id="tac-half" value={t.half ? 'yari' : 'tam'} onChange={(e) => update((d) => ({ ...d, half: e.target.value === 'yari' }))}>
                    <option value="tam">Tam saha</option>
                    <option value="yari">Yarı saha</option>
                  </select>
                </Field>
                <Field label="Bizim diziliş">
                  <select id="tac-form" value={t.formation} onChange={(e) => applyFormation('home', e.target.value)} title="Bu adıma uygulanır">
                    {FORMATION_NAMES.map((f) => (
                      <option key={f}>{f}</option>
                    ))}
                  </select>
                </Field>
                <Field label="Rakip dizilişi">
                  <select id="tac-away" value={t.awayFormation ?? ''} disabled={!t.tokens.some((k) => k.kind === 'away')} onChange={(e) => applyFormation('away', e.target.value)}>
                    <option value="" disabled>
                      —
                    </option>
                    {FORMATION_NAMES.map((f) => (
                      <option key={f}>{f}</option>
                    ))}
                  </select>
                </Field>
                <Field label="Oyuncu boyutu">
                  <select id="tac-scale" value={String(t.tokenScale ?? 1)} onChange={(e) => update((d) => ({ ...d, tokenScale: +e.target.value === 1 ? undefined : +e.target.value }))}>
                    <option value="1">Normal</option>
                    <option value="0.7">Küçük</option>
                  </select>
                </Field>
                <Field label="Animasyon hızı">
                  <select id="tac-speed" value={String(t.stepMs ?? 1500)} onChange={(e) => update((d) => ({ ...d, stepMs: +e.target.value }))}>
                    <option value="2400">Yavaş</option>
                    <option value="1500">Normal</option>
                    <option value="900">Hızlı</option>
                  </select>
                </Field>
              </div>
            ) : null}
            <button type="button" className="desc-card" onClick={() => setDescOpen(true)}>
              <span className="field-label">Anlatım ve koçluk noktaları</span>
              <span className="desc-preview">{t.description || (canEdit ? 'Anlatım ekleyin…' : 'Anlatım yok.')}</span>
              <span className="desc-more">{canEdit ? 'Düzenle' : 'Tümünü oku'}</span>
            </button>
            {t.libId && libItem(t.libId) && (
              <p className="small muted">
                Kütüphaneden kopya: <a href={'#kutuphane-' + t.libId}>{libItem(t.libId)!.def.name}</a>
              </p>
            )}
            <p className="hint small">Oyuncu ve top her araçta sürüklenir · koşu, pas ve top sürme okunu taşın hemen yanından başlatın: oynatınca okun ucuna gider · oka dokunup × ile silin · adımın köşesindeki × adımı siler · ← → adım, boşluk: oynat</p>
            {canEdit && (
              <ConfirmBtn
                variant="ghost"
                icon="trash"
                size="sm"
                label="Silmek için tekrar dokunun"
                onConfirm={() => {
                  remove('tactics', t.id);
                  onBack();
                }}
              >
                Taktiği sil
              </ConfirmBtn>
            )}
          </section>
        )}
      </aside>

      {descOpen && (
        <Modal
          title="Anlatım ve koçluk noktaları"
          onClose={() => setDescOpen(false)}
          wide
          footer={
            <Btn variant="primary" onClick={() => setDescOpen(false)}>
              Tamam
            </Btn>
          }
        >
          {canEdit ? (
            <div className="form-grid">
              <Field label="Anlatım" wide>
                <textarea id="tac-desc" rows={6} value={t.description ?? ''} onChange={(e) => update((d) => ({ ...d, description: e.target.value }), false)} placeholder="Taktiğin amacı, ne zaman ve nasıl uygulanır" />
              </Field>
              <Field label="Koçluk noktaları (her satır bir madde)" wide>
                <textarea id="tac-points" rows={5} value={t.points ?? ''} onChange={(e) => update((d) => ({ ...d, points: e.target.value }), false)} />
              </Field>
              <Field label="Kaynak / köken" wide>
                <input id="tac-src" value={t.source ?? ''} onChange={(e) => update((d) => ({ ...d, source: e.target.value }), false)} placeholder="Ör. kendi çalışmamız, UEFA A lisans notları" />
              </Field>
            </div>
          ) : (
            <>
              {t.description && <p>{t.description}</p>}
              {t.points && (
                <ul className="points">
                  {t.points
                    .split('\n')
                    .filter(Boolean)
                    .map((x) => (
                      <li key={x}>{x}</li>
                    ))}
                </ul>
              )}
              {t.source && <p className="small muted">Kaynak: {t.source}</p>}
            </>
          )}
        </Modal>
      )}
      {lesson && (
        <LessonUI
          t={t}
          fi={fi}
          anim={anim}
          canEdit={canEdit}
          tool={tool}
          setTool={setTool}
          color={color}
          setColor={setColor}
          canUndo={history.current.length > 0}
          onUndo={undo}
          onAdd={addToken}
          onAddFrame={addFrame}
          onDelFrame={delFrameAt}
          kindLabel={kindLabel}
          hint={fsHint}
          onHint={setFsHint}
          onExit={endLesson}
        />
      )}
      {sharing && <ShareModal kind="taktik" id={t.id} title={t.name} onClose={() => setSharing(false)} />}
    </div>
  );
}

type LessonPanels = { tools: boolean; steps: boolean; note: boolean };
const LESSON_KEY = 'saha-kenari-ders';
const readPanels = (): LessonPanels => {
  const all = { tools: true, steps: true, note: true };
  try {
    return { ...all, ...JSON.parse(localStorage.getItem(LESSON_KEY) ?? '{}') };
  } catch {
    return all;
  }
};

function LzBtn({ icon, label, on, onClick }: { icon: string; label: string; on?: boolean; onClick: () => void }) {
  return (
    <button type="button" className={'lz-btn' + (on ? ' on' : '')} aria-pressed={on} title={label} onClick={onClick}>
      <Icon name={icon} size={20} />
      <span>{label}</span>
    </button>
  );
}

/** Ders modu yüzer panelleri: araçlar (sol), adımlar (alt), not (sol üst); her biri üst sağdaki düğmelerle açılıp kapanır */
function LessonUI(props: {
  t: Tactic;
  fi: number;
  anim: ReturnType<typeof useTacticAnimation>;
  canEdit: boolean;
  tool: Tool;
  setTool: (t: Tool) => void;
  color: string;
  setColor: (c: string) => void;
  canUndo: boolean;
  onUndo: () => void;
  onAdd: (k: TokenKind) => void;
  onAddFrame: () => void;
  onDelFrame: (i: number) => void;
  kindLabel: (k: TokenKind) => string;
  hint: string | null;
  onHint: (h: string | null) => void;
  onExit: () => void;
}) {
  const { t, fi, anim, canEdit, tool } = props;
  const [panels, setPanels] = useState(readPanels);
  const fs = useFullscreen();
  const toggle = (k: keyof LessonPanels) =>
    setPanels((p) => {
      const n = { ...p, [k]: !p[k] };
      try {
        localStorage.setItem(LESSON_KEY, JSON.stringify(n));
      } catch {
        /* özel pencere */
      }
      return n;
    });
  const toggleFs = async () => {
    if (fs) await exitFullscreen();
    else props.onHint((await enterFullscreen()) ? null : fullscreenHint());
  };
  const note = t.frames[fi]?.note;
  return (
    <>
      <div className="lz-top" role="toolbar" aria-label="Ders modu">
        {canEdit && <LzBtn icon={TOOLS.find((x) => x.id === tool)?.icon ?? 'move'} label="Araçlar" on={panels.tools} onClick={() => toggle('tools')} />}
        <LzBtn icon="play" label="Adımlar" on={panels.steps} onClick={() => toggle('steps')} />
        <LzBtn icon="note" label="Not" on={panels.note} onClick={() => toggle('note')} />
        <LzBtn icon="expand" label={fs ? 'Küçült' : 'Tam ekran'} on={fs} onClick={toggleFs} />
        <LzBtn icon="close" label="Çık" onClick={props.onExit} />
      </div>
      {props.hint && (
        <div className="lz-hint" role="status">
          <span>{props.hint}</span>
          <button type="button" aria-label="İpucunu kapat" onClick={() => props.onHint(null)}>
            <Icon name="close" size={16} />
          </button>
        </div>
      )}
      {panels.note && (
        <div className="lz-note">
          <small>
            {t.name} · Adım {fi + 1}/{t.frames.length}
          </small>
          {note && <p>{note}</p>}
        </div>
      )}
      {canEdit && panels.tools && (
        <div className="lz-dock" role="toolbar" aria-label="Çizim araçları">
          {TOOLS.map((x) => (
            <button key={x.id} type="button" className={'tool' + (tool === x.id ? ' on' : '')} onClick={() => props.setTool(x.id)} title={x.label}>
              <Icon name={x.icon} size={20} />
              <span>{x.label}</span>
            </button>
          ))}
          <div className="lz-group lz-sw">
            {['a', 'b', 'c', 'd'].map((c) => (
              <button key={c} type="button" className={'swatch' + (props.color === c ? ' on' : '')} style={{ background: `var(--ink-draw-${c})` }} onClick={() => props.setColor(c)} aria-label={`Renk ${c}`} />
            ))}
          </div>
          <div className="lz-group">
            {ADDS.map((k) => (
              <button key={k} type="button" className="add-tok" onClick={() => props.onAdd(k)} title={props.kindLabel(k) + ' ekle'}>
                <i className={'add-ico ' + k} aria-hidden="true" />
                <span>+ {props.kindLabel(k)}</span>
              </button>
            ))}
            <Btn size="sm" variant="ghost" icon="undo" onClick={props.onUndo} disabled={!props.canUndo} title="Geri al" aria-label="Geri al" />
          </div>
        </div>
      )}
      {panels.steps && (
        <div className="lz-steps" role="toolbar" aria-label="Adımlar ve oynatma">
          <Btn icon={anim.playing ? 'pause' : 'play'} variant="primary" onClick={anim.playing ? anim.stop : anim.play} disabled={t.frames.length < 2}>
            {anim.playing ? 'Durdur' : 'Oynat'}
          </Btn>
          <Btn icon="prev" variant="ghost" onClick={() => anim.setFi(fi - 1)} disabled={fi === 0} aria-label="Önceki adım" />
          <StepChips n={t.frames.length} fi={fi} editable={canEdit && !anim.playing} onGo={anim.setFi} onAdd={props.onAddFrame} onDel={props.onDelFrame} addLabel="+" />
          <Btn icon="next" variant="ghost" onClick={() => anim.setFi(fi + 1)} disabled={fi >= t.frames.length - 1} aria-label="Sonraki adım" />
        </div>
      )}
    </>
  );
}

/** Adım düğmeleri: dokununca o adıma gider, köşedeki × o adımı siler */
function StepChips(props: { n: number; fi: number; editable: boolean; onGo: (i: number) => void; onAdd: () => void; onDel: (i: number) => void; addLabel: string }) {
  const { n, fi, editable } = props;
  return (
    <ol className="frame-list">
      {Array.from({ length: n }, (_, i) => (
        <li key={i} className={i === fi ? 'on' : ''}>
          <button type="button" className={i === fi ? 'on' : ''} onClick={() => props.onGo(i)}>
            {i + 1}
          </button>
          {editable && n > 1 && (
            <button type="button" className="chip-del" onClick={() => props.onDel(i)} aria-label={`Adım ${i + 1}: sil`} title={`Adım ${i + 1}: sil`}>
              <Icon name="close" size={10} />
            </button>
          )}
        </li>
      ))}
      {editable && (
        <li>
          <button type="button" className="add" onClick={props.onAdd} title="Bu adımı kopyalayıp yeni adım ekle">
            {props.addLabel}
          </button>
        </li>
      )}
    </ol>
  );
}
