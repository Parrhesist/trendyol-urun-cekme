import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pitch, MiniPitch, type Tool } from '../components/Pitch';
import { useTacticAnimation, useTokenSub } from '../components/TacticPlayer';
import { cloneFrame, FORMATION_NAMES, FORMATIONS, makeTactic, mirror, uid } from '../football';
import { autoLineup } from '../lineup';
import { useStore } from '../store';
import type { Pt, Tactic, TacticCategory, Token, TokenKind } from '../types';
import { Btn, ConfirmBtn, Empty, Field, Icon, Modal, Segmented, toggleFullscreen } from '../ui';
import { ShareModal } from './Share';

const CATEGORIES: TacticCategory[] = ['Hücum', 'Savunma', 'Geçiş', 'Duran Top', 'Antrenman'];

const TOOLS: { id: Tool; icon: string; label: string }[] = [
  { id: 'move', icon: 'move', label: 'Taşı' },
  { id: 'run', icon: 'run', label: 'Koşu' },
  { id: 'pass', icon: 'pass', label: 'Pas' },
  { id: 'dribble', icon: 'dribble', label: 'Top sürme' },
  { id: 'zone', icon: 'zone', label: 'Bölge' },
  { id: 'line', icon: 'line', label: 'Hat' },
  { id: 'erase', icon: 'eraser', label: 'Sil' },
];

export function TacticBoard({ openId, onOpen }: { openId?: string; onOpen: (id: string | null) => void }) {
  const { data, canEdit } = useStore();
  const [filter, setFilter] = useState<TacticCategory | 'Tümü'>('Tümü');
  const [creating, setCreating] = useState(false);
  const list = useMemo(
    () => [...data.tactics].filter((t) => filter === 'Tümü' || t.category === filter).sort((a, b) => b.updatedAt - a.updatedAt),
    [data.tactics, filter],
  );
  const current = data.tactics.find((t) => t.id === openId);

  if (openId && current) return <Editor key={current.id} tactic={current} onBack={() => onOpen(null)} />;

  const colors = { home: data.settings.homeColor, away: data.settings.awayColor };
  return (
    <div className="page">
      <header className="page-head">
        <div>
          <p className="eyebrow">Taktik kütüphanesi</p>
          <h1>Taktik Tahtası</h1>
        </div>
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
              <MiniPitch tokens={t.tokens} pos={t.frames[0].pos} drawings={t.frames[t.frames.length > 1 ? 1 : 0].drawings} half={t.half} colors={colors} />
              <div className="tcard-body">
                <span className={'cat cat-' + CATEGORIES.indexOf(t.category)}>{t.category}</span>
                <strong>{t.name}</strong>
                <small>
                  {t.formation}
                  {t.awayFormation ? ` – ${t.awayFormation}` : ''} · {t.frames.length} adım
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
  const create = async () => {
    let t: Tactic;
    if (blank) {
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
        <Field label="Bizim diziliş" hint="İlk 11 kadrodan otomatik yerleşir">
          <select id="nt-form" value={formation} onChange={(e) => setFormation(e.target.value)} disabled={blank}>
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

function Editor({ tactic, onBack }: { tactic: Tactic; onBack: () => void }) {
  const { data, save, remove, canEdit, toast } = useStore();
  const [t, setT] = useState<Tactic>(tactic);
  const [tool, setTool] = useState<Tool>('move');
  const [color, setColor] = useState('a');
  const [selected, setSelected] = useState<string | null>(null);
  const [present, setPresent] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [dirty, setDirty] = useState(false);
  const history = useRef<Tactic[]>([]);
  const rootRef = useRef<HTMLDivElement>(null);
  const anim = useTacticAnimation(t);
  const sub = useTokenSub();
  const fi = Math.min(anim.fi, t.frames.length - 1);
  const frame = t.frames[fi];
  const editable = canEdit && !anim.playing && anim.progress >= 1 && !present;
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

  const delFrame = () => {
    if (t.frames.length < 2) return;
    update((d) => ({ ...d, frames: d.frames.filter((_, i) => i !== fi) }));
    anim.setFi(Math.max(0, fi - 1));
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

  const enterPresent = () => {
    setPresent(true);
    setSelected(null);
    toggleFullscreen(rootRef.current);
  };
  const exitPresent = () => {
    setPresent(false);
    if (document.fullscreenElement) toggleFullscreen();
  };

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
      if (e.key === 'Escape' && present) exitPresent();
    };
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  });

  const players = [...data.players].sort((a, b) => a.number - b.number);

  return (
    <div className={'editor' + (present ? ' presenting' : '')} ref={rootRef}>
      <header className="editor-head">
        {!present && <Btn variant="ghost" icon="prev" onClick={onBack} aria-label="Taktiklere dön" />}
        {canEdit && !present ? (
          <input id="tac-name" className="title-input" value={t.name} onChange={(e) => update((d) => ({ ...d, name: e.target.value }), false)} aria-label="Taktik adı" />
        ) : (
          <h1 className="editor-title">{t.name}</h1>
        )}
        <div className="editor-actions">
          {!present && canEdit && (
            <span className="save-state" aria-live="polite">
              {dirty ? 'Kaydediliyor…' : 'Kaydedildi'}
            </span>
          )}
          {!present && <Btn icon="share" onClick={() => setSharing(true)}>Paylaş</Btn>}
          {present ? (
            <Btn icon="close" variant="primary" onClick={exitPresent}>
              Sunumdan çık
            </Btn>
          ) : (
            <Btn icon="present" variant="primary" onClick={enterPresent}>
              Sunum
            </Btn>
          )}
        </div>
      </header>

      {editable && (
        <div className="toolbar" role="toolbar" aria-label="Çizim araçları">
          <div className="tool-group">
            {TOOLS.map((x) => (
              <button key={x.id} type="button" className={'tool' + (tool === x.id ? ' on' : '')} onClick={() => setTool(x.id)} title={x.label}>
                <Icon name={x.icon} size={20} />
                <span>{x.label}</span>
              </button>
            ))}
          </div>
          <div className="tool-group">
            {['a', 'b', 'c', 'd'].map((c) => (
              <button key={c} type="button" className={'swatch' + (color === c ? ' on' : '')} style={{ background: `var(--ink-draw-${c})` }} onClick={() => setColor(c)} aria-label={`Renk ${c}`} />
            ))}
          </div>
          <div className="tool-group">
            <Btn size="sm" onClick={() => addToken('home')}>+ Oyuncu</Btn>
            <Btn size="sm" onClick={() => addToken('away')}>+ Rakip</Btn>
            <Btn size="sm" onClick={() => addToken('ball')}>+ Top</Btn>
            <Btn size="sm" onClick={() => addToken('cone')}>+ Huni</Btn>
            <Btn size="sm" onClick={() => addToken('goal')}>+ Kale</Btn>
          </div>
          <div className="tool-group">
            <Btn size="sm" variant="ghost" onClick={undo} disabled={!history.current.length}>
              Geri al
            </Btn>
          </div>
        </div>
      )}

      <div className="editor-main">
        <div className="board-wrap">
          <Pitch
            tokens={t.tokens}
            pos={anim.pos}
            drawings={frame.drawings}
            half={t.half}
            colors={colors}
            subFor={sub}
            tool={tool}
            color={color}
            editable={editable}
            selected={selected}
            onSelect={setSelected}
            onMove={onMove}
            onMoveEnd={() => (moveStart.current = false)}
            onDraw={(d) => setFrame((f) => ({ ...f, drawings: [...f.drawings, d] }))}
            onErase={(id) => setFrame((f) => ({ ...f, drawings: f.drawings.filter((x) => x.id !== id) }))}
            className="board"
          />
        </div>

        {!present && (
          <aside className="inspector">
            {selTok && editable ? (
              <section>
                <h3>Seçili: {selTok.kind === 'home' ? 'Oyuncu' : selTok.kind === 'away' ? 'Rakip' : selTok.kind === 'ball' ? 'Top' : selTok.kind === 'cone' ? 'Huni' : 'Kale'}</h3>
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
                <h3>Ayarlar</h3>
                {canEdit ? (
                  <>
                    <Field label="Kategori">
                      <select id="tac-cat" value={t.category} onChange={(e) => update((d) => ({ ...d, category: e.target.value as TacticCategory }))}>
                        {CATEGORIES.map((c) => (
                          <option key={c}>{c}</option>
                        ))}
                      </select>
                    </Field>
                    <Field label="Bizim diziliş (bu adıma uygula)">
                      <select id="tac-form" value={t.formation} onChange={(e) => applyFormation('home', e.target.value)}>
                        {FORMATION_NAMES.map((f) => (
                          <option key={f}>{f}</option>
                        ))}
                      </select>
                    </Field>
                    {t.tokens.some((k) => k.kind === 'away') && (
                      <Field label="Rakip dizilişi">
                        <select id="tac-away" value={t.awayFormation ?? ''} onChange={(e) => applyFormation('away', e.target.value)}>
                          <option value="" disabled>
                            —
                          </option>
                          {FORMATION_NAMES.map((f) => (
                            <option key={f}>{f}</option>
                          ))}
                        </select>
                      </Field>
                    )}
                    <Field label="Görünüm">
                      <select id="tac-half" value={t.half ? 'yari' : 'tam'} onChange={(e) => update((d) => ({ ...d, half: e.target.value === 'yari' }))}>
                        <option value="tam">Tam saha</option>
                        <option value="yari">Yarı saha</option>
                      </select>
                    </Field>
                    <Field label="Açıklama">
                      <textarea id="tac-desc" rows={3} value={t.description ?? ''} onChange={(e) => update((d) => ({ ...d, description: e.target.value }), false)} />
                    </Field>
                  </>
                ) : (
                  t.description && <p className="muted">{t.description}</p>
                )}
                <p className="hint">
                  <strong>İpucu:</strong> Oyuncuları sürükleyin, okları çizin, sonra “Adım ekle” ile bir sonraki anı kurun. Oynat tuşu adımları animasyonla gösterir. Klavye: ← → adım, boşluk oynat.
                </p>
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
        )}
      </div>

      <footer className="frames">
        <div className="frames-ctrl">
          <Btn icon={anim.playing ? 'pause' : 'play'} variant="primary" size="lg" onClick={anim.playing ? anim.stop : anim.play} disabled={t.frames.length < 2}>
            {anim.playing ? 'Durdur' : 'Oynat'}
          </Btn>
          <Btn icon="prev" variant="ghost" size="lg" onClick={() => anim.setFi(fi - 1)} disabled={fi === 0} aria-label="Önceki adım" />
          <Btn icon="next" variant="ghost" size="lg" onClick={() => anim.setFi(fi + 1)} disabled={fi >= t.frames.length - 1} aria-label="Sonraki adım" />
        </div>
        <ol className="frame-list">
          {t.frames.map((_, i) => (
            <li key={i}>
              <button type="button" className={i === fi ? 'on' : ''} onClick={() => anim.setFi(i)}>
                {i + 1}
              </button>
            </li>
          ))}
          {editable && (
            <li>
              <button type="button" className="add" onClick={addFrame} title="Bu adımı kopyalayıp yeni adım ekle">
                + Adım ekle
              </button>
            </li>
          )}
        </ol>
        <div className="frame-note">
          {editable ? (
            <textarea id="frame-note" rows={2} placeholder={`Adım ${fi + 1} için koçluk notu: kim, nereye, ne zaman?`} value={frame.note ?? ''} onChange={(e) => setFrame((f) => ({ ...f, note: e.target.value }), false)} />
          ) : (
            <p className="note-read">{frame.note || (present ? '' : 'Bu adım için not yok.')}</p>
          )}
          {editable && t.frames.length > 1 && (
            <Btn variant="ghost" size="sm" icon="trash" onClick={delFrame}>
              Adımı sil
            </Btn>
          )}
        </div>
      </footer>
      {sharing && <ShareModal kind="taktik" id={t.id} title={t.name} onClose={() => setSharing(false)} />}
    </div>
  );
}
