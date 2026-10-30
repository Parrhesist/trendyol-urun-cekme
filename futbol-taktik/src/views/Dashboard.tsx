import { MiniPitch } from '../components/Pitch';
import { addDays, fmtDate, STATUS_META, todayISO } from '../football';
import { surname } from '../lineup';
import { useStore } from '../store';
import { acwr, acwrText, acwrTone, isPlayed, result, RESULT_LABEL, sessionMinutes } from '../stats';
import { Btn, Icon, Pill } from '../ui';

export function Dashboard({ go }: { go: (hash: string) => void }) {
  const { data } = useStore();
  const today = todayISO();
  const next = [...data.matches].filter((m) => !isPlayed(m) && m.date >= today).sort((a, b) => a.date.localeCompare(b.date))[0];
  const played = [...data.matches].filter(isPlayed).sort((a, b) => b.date.localeCompare(a.date));
  const last5 = played.slice(0, 5);
  const pts = played.reduce((a, m) => a + (result(m) === 'G' ? 3 : result(m) === 'B' ? 1 : 0), 0);
  const gf = played.reduce((a, m) => a + (m.post.us ?? 0), 0);
  const ga = played.reduce((a, m) => a + (m.post.them ?? 0), 0);
  const upcomingSessions = data.sessions.filter((s) => s.date >= today && s.date <= addDays(today, 6)).sort((a, b) => a.date.localeCompare(b.date));
  const unavailable = data.players.filter((p) => p.status !== 'hazir');
  const ratio = acwr(data.sessions);
  const recent = [...data.tactics].filter((t) => t.category !== 'Antrenman').sort((a, b) => b.updatedAt - a.updatedAt).slice(0, 3);
  const colors = { home: data.settings.homeColor, away: data.settings.awayColor };
  const days = next ? Math.round((+new Date(next.date + 'T12:00:00') - +new Date(today + 'T12:00:00')) / 864e5) : 0;

  return (
    <div className="page">
      <header className="page-head">
        <div>
          <p className="eyebrow">{fmtDate(today, { weekday: 'long', day: 'numeric', month: 'long' })}</p>
          <h1>{data.settings.teamName}</h1>
        </div>
        <a className="btn btn-plain btn-md" href="#ekran" title="TV'de açtıysanız buna basın: bu cihaz sunumların gösterileceği ekran olur">
          <Icon name="cast" />
          <span>Bu cihazı TV ekranı yap</span>
        </a>
      </header>

      <div className="dash">
        <section className="panel next-match">
          {next ? (
            <>
              <p className="eyebrow">Sıradaki maç · {days === 0 ? 'bugün' : `${days} gün sonra`}</p>
              <h2 className="vs">
                <span>{data.settings.shortName}</span>
                <small>{next.venue === 'İç Saha' ? 'vs' : '@'}</small>
                <span>{next.opponent}</span>
              </h2>
              <p className="muted">
                {fmtDate(next.date, { weekday: 'long', day: 'numeric', month: 'long' })} · {next.time} · {next.competition}
              </p>
              <div className="row">
                <Btn variant="primary" onClick={() => go('mac-' + next.id)}>
                  Maç hazırlığı
                </Btn>
              </div>
            </>
          ) : (
            <>
              <p className="eyebrow">Sıradaki maç</p>
              <h2>Planlanmış maç yok</h2>
              <Btn onClick={() => go('maclar')}>Maç ekle</Btn>
            </>
          )}
        </section>

        <section className="panel">
          <p className="eyebrow">Sezon</p>
          <div className="season">
            <div>
              <span className="kpi-num tabnum">{played.length}</span>
              <small>maç</small>
            </div>
            <div>
              <span className="kpi-num tabnum">{pts}</span>
              <small>puan</small>
            </div>
            <div>
              <span className="kpi-num tabnum">
                {gf}:{ga}
              </span>
              <small>averaj</small>
            </div>
          </div>
          <div className="form-row" aria-label="Son 5 maç">
            {last5.map((m) => {
              const r = result(m)!;
              return (
                <button key={m.id} type="button" className={'form-chip res-' + r} onClick={() => go('mac-' + m.id)} title={`${m.opponent} ${m.post.us}–${m.post.them} (${RESULT_LABEL[r]})`}>
                  {r}
                </button>
              );
            })}
            <span className="muted small">son maçlar, yeniden eskiye</span>
          </div>
        </section>

        <section className="panel">
          <p className="eyebrow">Yük durumu</p>
          <div className="kpi">
            <span className="kpi-num tabnum">{ratio.ratio ? ratio.ratio.toFixed(2).replace('.', ',') : '—'}</span>
            <Pill tone={acwrTone(ratio.ratio)}>{acwrText(ratio.ratio)}</Pill>
          </div>
          <p className="muted small">Akut:kronik yük oranı (son 7 gün / 28 gün ortalaması)</p>
        </section>

        <section className="panel">
          <div className="row between">
            <p className="eyebrow">Bu hafta antrenman</p>
            <Btn size="sm" variant="ghost" onClick={() => go('antrenman')}>
              Plana git
            </Btn>
          </div>
          {upcomingSessions.length ? (
            <ul className="mini-list">
              {upcomingSessions.map((s) => (
                <li key={s.id}>
                  <span className="tabnum date">{fmtDate(s.date, { weekday: 'short', day: 'numeric' })}</span>
                  <span className="stacked">
                    <strong>{s.title}</strong>
                    <small className="muted">{s.focus}</small>
                  </span>
                  <span className="tabnum muted">
                    {sessionMinutes(s)} dk · RPE {s.rpe}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="muted">Önümüzdeki 7 gün için seans yok.</p>
          )}
        </section>

        <section className="panel">
          <div className="row between">
            <p className="eyebrow">Kadro durumu</p>
            <Btn size="sm" variant="ghost" onClick={() => go('kadro')}>
              Kadro
            </Btn>
          </div>
          {unavailable.length ? (
            <ul className="mini-list">
              {unavailable.map((p) => (
                <li key={p.id}>
                  <span className="shirt">{p.number}</span>
                  <span>
                    <strong>{surname(p.name)}</strong> <small className="muted">{p.note}</small>
                  </span>
                  <Pill tone={STATUS_META[p.status].tone}>{STATUS_META[p.status].label}</Pill>
                </li>
              ))}
            </ul>
          ) : (
            <p className="muted">Tüm oyuncular hazır.</p>
          )}
        </section>

        <section className="panel recent">
          <div className="row between">
            <p className="eyebrow">Son taktikler</p>
            <Btn size="sm" variant="ghost" onClick={() => go('taktik')}>
              Tümü
            </Btn>
          </div>
          <div className="recent-grid">
            {recent.map((t) => (
              <button key={t.id} type="button" className="recent-t" onClick={() => go('taktik-' + t.id)}>
                <MiniPitch tokens={t.tokens} pos={t.frames[0].pos} drawings={t.frames[Math.min(1, t.frames.length - 1)].drawings} half={t.half} colors={colors} />
                <span>{t.name}</span>
              </button>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
