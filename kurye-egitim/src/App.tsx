import { useEffect, useMemo, useState } from 'react';
import { ALL_LESSONS, ALL_QUESTIONS, CHECKLIST, SENARYOLAR, CONTENT_REVIEWED, GLOSSARY, MODULES, findLesson, findModule, findQuestion } from './content';
import { Icon } from './icons';
import { CATEGORIES, SIGNS, Sign, isWide, SIGN_NAMES, type SignId } from './signs';
import { signTest } from './signquiz';
import { Scene, type SpotState } from './scene';
import {
  answerReview, dueReviews, markRead, resetAll, resetCheck, saveQuiz, saveScenario, saveSignTest, streak, todaysCheck, toggleCheck, useAppState,
  type State,
} from './store';
import type { Block, IconName, Lesson, Module, Question, Scenario, Spot } from './types';

/* ---------- Yönlendirme (adres çubuğundaki #) ---------- */

const go = (hash: string) => {
  location.hash = hash ? `#${hash}` : '';
  if (!hash) history.replaceState(null, '', location.pathname + location.search);
};

function useRoute() {
  const read = () => decodeURIComponent(location.hash.replace(/^#/, ''));
  const [route, setRoute] = useState(read);
  useEffect(() => {
    const on = () => {
      setRoute(read());
      window.scrollTo(0, 0);
    };
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);
  return route;
}

type Tab = 'bugun' | 'dersler' | 'isaretler' | 'kontrol' | 'sozluk';
const TABS: { id: Tab; label: string; icon: IconName }[] = [
  { id: 'bugun', label: 'Bugün', icon: 'home' },
  { id: 'dersler', label: 'Dersler', icon: 'book' },
  { id: 'isaretler', label: 'İşaretler', icon: 'sign' },
  { id: 'kontrol', label: 'Kontrol', icon: 'check' },
  { id: 'sozluk', label: 'Sözlük', icon: 'dict' },
];

export default function App() {
  const route = useRoute();
  const s = useAppState();
  const [head, ...rest] = route.split('-');
  const arg = rest.join('-');

  let page: JSX.Element;
  let tab: Tab | null = null;

  if (head === 'modul' && findModule(arg)) page = <ModulePage m={findModule(arg)!} s={s} />;
  else if (head === 'ders' && findLesson(arg)) page = <LessonPage id={arg} />;
  else if (head === 'test' && findLesson(arg)) page = <LessonQuiz id={arg} />;
  else if (route === 'tekrar') page = <ReviewQuiz s={s} />;
  else if (route === 'hizli-test') page = <QuickQuiz />;
  else if (route === 'senaryolar') page = <ScenarioList s={s} />;
  else if (head === 'senaryo' && SENARYOLAR.some((x) => x.id === arg)) page = <ScenarioPage key={arg} id={arg} />;
  else if (route === 'isaret-testi') page = <SignQuiz />;
  else if (route === 'isaretler') (tab = 'isaretler'), (page = <SignsPage s={s} />);
  else if (route === 'hakkinda') page = <About />;
  else if (route === 'dersler') (tab = 'dersler'), (page = <ModulesPage s={s} />);
  else if (route === 'kontrol') (tab = 'kontrol'), (page = <CheckPage s={s} />);
  else if (route === 'sozluk') (tab = 'sozluk'), (page = <GlossaryPage />);
  else (tab = 'bugun'), (page = <Home s={s} />);

  return (
    <div className={tab ? 'app has-tabs' : 'app'}>
      <main className="page" key={route}>
        {page}
      </main>
      {tab && (
        <nav className="tabbar" aria-label="Ana menü">
          <div className="tabbar-inner">
            {TABS.map((t) => (
              <a key={t.id} href={t.id === 'bugun' ? '#' : `#${t.id}`} className={t.id === tab ? 'tab on' : 'tab'} aria-current={t.id === tab ? 'page' : undefined}>
                <Icon name={t.icon} size={24} />
                <span>{t.label}</span>
              </a>
            ))}
          </div>
        </nav>
      )}
    </div>
  );
}

/* ---------- Ortak parçalar ---------- */

function NavBar({ back, backLabel, title, right }: { back: string; backLabel: string; title?: string; right?: JSX.Element }) {
  return (
    <header className="navbar">
      <button className="nav-back" onClick={() => go(back)}>
        <Icon name="back" size={22} />
        <span>{backLabel}</span>
      </button>
      {title && <div className="nav-title">{title}</div>}
      <div className="nav-right">{right}</div>
    </header>
  );
}

function LargeTitle({ title, sub, action }: { title: string; sub?: string; action?: JSX.Element }) {
  return (
    <div className="large-title">
      <div>
        <h1>{title}</h1>
        {sub && <p className="sub">{sub}</p>}
      </div>
      {action}
    </div>
  );
}

function Progress({ value, label }: { value: number; label?: string }) {
  return (
    <div className="bar" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(value * 100)} aria-label={label}>
      <div style={{ width: `${Math.min(100, value * 100)}%` }} />
    </div>
  );
}

function ModuleIcon({ name }: { name: IconName }) {
  return (
    <span className="tile">
      <Icon name={name} size={20} />
    </span>
  );
}

const lessonDone = (s: State, id: string) => s.lessons[id]?.best !== undefined;
const moduleDone = (s: State, m: Module) => m.lessons.filter((l) => lessonDone(s, l.id)).length;

/* ---------- Bugün ---------- */

function Home({ s }: { s: State }) {
  const done = ALL_LESSONS.filter(({ lesson }) => lessonDone(s, lesson.id)).length;
  const next = ALL_LESSONS.find(({ lesson }) => !lessonDone(s, lesson.id));
  const due = dueReviews(s).length;
  const st = streak(s);
  const scored = Object.values(s.lessons).filter((l) => l.total);
  const avg = scored.length ? Math.round((scored.reduce((a, l) => a + (l.best ?? 0) / (l.total ?? 1), 0) / scored.length) * 100) : null;
  const check = todaysCheck(s);
  const checkTotal = CHECKLIST.reduce((n, g) => n + g.items.length, 0);
  const dateLabel = new Date().toLocaleDateString('tr-TR', { weekday: 'long', day: 'numeric', month: 'long' });

  return (
    <>
      <LargeTitle
        title="Bugün"
        sub={dateLabel}
        action={
          <a href="#hakkinda" className="round-btn" aria-label="Hakkında">
            <Icon name="info" size={22} />
          </a>
        }
      />

      {next ? (
        <section className="card hero">
          <div className="eyebrow">
            {done === 0 ? 'Buradan başla' : 'Sıradaki ders'} · {next.module.title}
          </div>
          <h2>{next.lesson.title}</h2>
          <p className="muted">{next.lesson.summary}</p>
          <div className="hero-foot">
            <span className="meta">
              <Icon name="clock" size={16} /> {next.lesson.minutes} dk · {next.lesson.quiz.length} soru
            </span>
            <a className="btn primary" href={`#ders-${next.lesson.id}`}>
              {s.lessons[next.lesson.id]?.read ? 'Devam et' : 'Başla'}
            </a>
          </div>
        </section>
      ) : (
        <section className="card hero">
          <div className="eyebrow">Tebrikler</div>
          <h2>Bütün dersleri bitirdin</h2>
          <p className="muted">Bilgini taze tutmak için hızlı test çöz veya tekrar sorularına bak.</p>
        </section>
      )}

      <section className="stats card">
        <div>
          <strong>
            {done}
            <small>/{ALL_LESSONS.length}</small>
          </strong>
          <span>Ders</span>
        </div>
        <div>
          <strong>{st}</strong>
          <span>Gün seri</span>
        </div>
        <div>
          <strong>{avg === null ? '–' : `%${avg}`}</strong>
          <span>Başarı</span>
        </div>
      </section>

      <h3 className="section-label">Pratik</h3>
      <ul className="list card">
        <li>
          <a href="#senaryolar" className="row">
            <span className="tile"><Icon name="map" size={20} /></span>
            <span className="row-main">
              <span className="row-title">Senaryolar</span>
              <span className="row-sub">{scenSummary(s)}</span>
            </span>
            <Icon name="chevron" size={18} />
          </a>
        </li>
        <li>
          <a href="#tekrar" className="row">
            <span className="tile tint-red"><Icon name="repeat" size={20} /></span>
            <span className="row-main">
              <span className="row-title">Tekrar</span>
              <span className="row-sub">{due ? `${due} yanlış soru seni bekliyor` : 'Bekleyen soru yok'}</span>
            </span>
            {due > 0 && <span className="badge">{due}</span>}
            <Icon name="chevron" size={18} />
          </a>
        </li>
        <li>
          <a href="#hizli-test" className="row">
            <span className="tile"><Icon name="bolt" size={20} /></span>
            <span className="row-main">
              <span className="row-title">Hızlı test</span>
              <span className="row-sub">Tüm konulardan 10 karışık soru</span>
            </span>
            <Icon name="chevron" size={18} />
          </a>
        </li>
        <li>
          <a href="#isaret-testi" className="row">
            <span className="tile tint-amber"><Icon name="sign" size={20} /></span>
            <span className="row-main">
              <span className="row-title">İşaret testi</span>
              <span className="row-sub">{s.signBest ? `En iyi sonuç ${s.signBest.best}/${s.signBest.total}` : `${SIGNS.length} işaretten karışık 12 soru`}</span>
            </span>
            <Icon name="chevron" size={18} />
          </a>
        </li>
        <li>
          <a href="#kontrol" className="row">
            <span className="tile tint-green"><Icon name="check" size={20} /></span>
            <span className="row-main">
              <span className="row-title">Vardiya öncesi kontrol</span>
              <span className="row-sub">
                {check.done.length === checkTotal ? `Bugün tamamlandı${'finishedAt' in check && check.finishedAt ? ` · ${check.finishedAt}` : ''}` : `${check.done.length}/${checkTotal} madde`}
              </span>
            </span>
            <Icon name="chevron" size={18} />
          </a>
        </li>
      </ul>

      <h3 className="section-label">Konular</h3>
      <ModuleList s={s} />
    </>
  );
}

/* ---------- Dersler ---------- */

function ModuleList({ s }: { s: State }) {
  return (
    <ul className="list card">
      {MODULES.map((m) => {
        const n = moduleDone(s, m);
        return (
          <li key={m.id}>
            <a href={`#modul-${m.id}`} className="row">
              <ModuleIcon name={m.icon} />
              <span className="row-main">
                <span className="row-title">{m.title}</span>
                <span className="row-sub">{m.desc}</span>
                <Progress value={n / m.lessons.length} label={`${m.title} ilerleme`} />
              </span>
              <span className="row-count">
                {n}/{m.lessons.length}
              </span>
              <Icon name="chevron" size={18} />
            </a>
          </li>
        );
      })}
    </ul>
  );
}

function ModulesPage({ s }: { s: State }) {
  const total = ALL_LESSONS.length;
  const done = ALL_LESSONS.filter(({ lesson }) => lessonDone(s, lesson.id)).length;
  return (
    <>
      <LargeTitle title="Dersler" sub={`${MODULES.length} konu · ${total} ders · ${done} tamamlandı`} />
      <ModuleList s={s} />
    </>
  );
}

function LessonStatus({ s, l }: { s: State; l: Lesson }) {
  const p = s.lessons[l.id];
  if (p?.best !== undefined)
    return (
      <span className={p.best === p.total ? 'status full' : 'status done'} aria-label={`Test sonucu ${p.best}/${p.total}`}>
        {p.best}/{p.total}
      </span>
    );
  if (p?.read) return <span className="status read" aria-label="Okundu, test çözülmedi">Test</span>;
  return <span className="status" aria-label="Başlanmadı" />;
}

function ModulePage({ m, s }: { m: Module; s: State }) {
  const minutes = m.lessons.reduce((a, l) => a + l.minutes, 0);
  return (
    <>
      <NavBar back="dersler" backLabel="Dersler" />
      <LargeTitle title={m.title} sub={`${m.lessons.length} ders · yaklaşık ${minutes} dk`} />
      <ul className="list card">
        {m.lessons.map((l, i) => (
          <li key={l.id}>
            <a href={`#ders-${l.id}`} className="row">
              <span className="num">{i + 1}</span>
              <span className="row-main">
                <span className="row-title">{l.title}</span>
                <span className="row-sub">{l.summary}</span>
              </span>
              <LessonStatus s={s} l={l} />
              <Icon name="chevron" size={18} />
            </a>
          </li>
        ))}
      </ul>
      {m.scenarios && (
        <>
          <h3 className="section-label">Senaryolar</h3>
          <ScenarioRows s={s} list={m.scenarios} />
        </>
      )}
    </>
  );
}

/* ---------- Ders okuma ---------- */

const CALLOUT: Record<'tip' | 'warn' | 'law' | 'fine', string> = {
  tip: 'İpucu',
  warn: 'Dikkat',
  law: 'Yasa',
  fine: 'Ceza',
};

function BlockView({ b }: { b: Block }) {
  switch (b.t) {
    case 'p':
      return <p>{b.text}</p>;
    case 'h':
      return <h2 className="lesson-h">{b.text}</h2>;
    case 'list':
      return (
        <ul className="bullets">
          {b.items.map((x) => (
            <li key={x}>{x}</li>
          ))}
        </ul>
      );
    case 'steps':
      return (
        <ol className="steps">
          {b.items.map((x) => (
            <li key={x}>{x}</li>
          ))}
        </ol>
      );
    case 'tip':
    case 'warn':
    case 'law':
    case 'fine':
      return (
        <aside className={`callout ${b.t}`}>
          <div className="callout-label">{CALLOUT[b.t]}</div>
          <p>{b.text}</p>
        </aside>
      );
    case 'terms':
      return (
        <div className="terms">
          <div className="terms-label">Almanca terimler</div>
          <dl>
            {b.items.map(([de, tr]) => (
              <div key={de}>
                <dt lang="de">{de}</dt>
                <dd>{tr}</dd>
              </div>
            ))}
          </dl>
        </div>
      );
    case 'signs':
      return (
        <div className="signs">
          {b.items.map(([id, cap]) => (
            <figure key={id}>
              <Sign id={id} size={64} />
              <figcaption>
                <strong>{cap}</strong>
                <span lang="de">{SIGN_NAMES[id]}</span>
              </figcaption>
            </figure>
          ))}
        </div>
      );
    case 'table':
      return (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>{b.head[0]}</th>
                <th>{b.head[1]}</th>
              </tr>
            </thead>
            <tbody>
              {b.rows.map(([a, c]) => (
                <tr key={a}>
                  <td>{a}</td>
                  <td>{c}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
  }
}

function LessonPage({ id }: { id: string }) {
  const { lesson, module } = findLesson(id)!;
  const idx = module.lessons.indexOf(lesson);
  return (
    <>
      <NavBar back={`modul-${module.id}`} backLabel={module.title} />
      <article className="lesson">
        <div className="eyebrow">
          {module.title} · Ders {idx + 1}/{module.lessons.length}
        </div>
        <h1>{lesson.title}</h1>
        <p className="meta">
          <Icon name="clock" size={16} /> {lesson.minutes} dk okuma · {lesson.quiz.length} soru
        </p>
        <div className="lesson-body">
          {lesson.blocks.map((b, i) => (
            <BlockView key={i} b={b} />
          ))}
        </div>
      </article>
      <div className="lesson-end card">
        <p>Dersi bitirdin. Şimdi kısa bir testle öğrendiklerini pekiştir.</p>
        <button
          className="btn primary wide"
          onClick={() => {
            markRead(lesson.id);
            go(`test-${lesson.id}`);
          }}
        >
          Teste başla ({lesson.quiz.length} soru)
        </button>
      </div>
    </>
  );
}

/* ---------- Quiz ---------- */

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

interface Prepared {
  q: Question;
  /** Karıştırılmış şıklar: orijinal sırası ile */
  opts: { text: string; orig: number }[];
}

const prepare = (qs: Question[]): Prepared[] =>
  qs.map((q) => ({ q, opts: shuffle(q.options.map((text, orig) => ({ text, orig }))) }));

function Quiz({
  questions,
  title,
  back,
  backLabel,
  onAnswer,
  onFinish,
  finish,
}: {
  questions: Question[];
  title: string;
  back: string;
  backLabel: string;
  onAnswer?: (q: Question, ok: boolean) => void;
  onFinish?: (right: string[], wrong: string[]) => void;
  finish: (right: number, total: number) => JSX.Element;
}) {
  const items = useMemo(() => prepare(questions), [questions]);
  const [i, setI] = useState(0);
  const [pick, setPick] = useState<number | null>(null);
  const [right, setRight] = useState<string[]>([]);
  const [wrong, setWrong] = useState<string[]>([]);
  const [ended, setEnded] = useState(false);

  if (ended) return <>{finish(right.length, items.length)}</>;

  const cur = items[i];
  const answered = pick !== null;
  const ok = answered && cur.opts[pick].orig === cur.q.answer;

  const choose = (k: number) => {
    if (answered) return;
    setPick(k);
    const good = cur.opts[k].orig === cur.q.answer;
    (good ? setRight : setWrong)((xs) => [...xs, cur.q.id]);
    onAnswer?.(cur.q, good);
  };

  const next = () => {
    if (i + 1 < items.length) {
      setI(i + 1);
      setPick(null);
      window.scrollTo(0, 0);
    } else {
      onFinish?.(right, wrong);
      setEnded(true);
      window.scrollTo(0, 0);
    }
  };

  return (
    <>
      <NavBar back={back} backLabel={backLabel} title={title} />
      <div className="quiz">
        <div className="quiz-top">
          <span className="muted">
            Soru {i + 1}/{items.length}
          </span>
          <Progress value={(i + (answered ? 1 : 0)) / items.length} label="Test ilerlemesi" />
        </div>
        <h2 className="question">{cur.q.q}</h2>
        {cur.q.sign && (
          <div className="q-sign">
            {(Array.isArray(cur.q.sign) ? cur.q.sign : [cur.q.sign]).map((id, n) => (
              <Sign key={id} id={id} size={n === 0 ? 112 : 104} />
            ))}
          </div>
        )}
        <div className={cur.q.optionSigns ? 'options sign-options' : 'options'} role="list">
          {cur.opts.map((o, k) => {
            let cls = 'option';
            if (answered) {
              if (o.orig === cur.q.answer) cls += ' correct';
              else if (k === pick) cls += ' wrong';
              else cls += ' dim';
            }
            return (
              <button key={k} className={cls} onClick={() => choose(k)} disabled={answered} role="listitem">
                <span className="opt-letter">{String.fromCharCode(65 + k)}</span>
                {cur.q.optionSigns ? (
                  <span className="opt-sign">
                    <Sign id={cur.q.optionSigns[o.orig]} size={84} />
                  </span>
                ) : (
                  <span>{o.text}</span>
                )}
              </button>
            );
          })}
        </div>
        {answered && (
          <div className={ok ? 'feedback ok' : 'feedback no'} role="status">
            <strong>{ok ? 'Doğru' : 'Yanlış'}</strong>
            <p>{cur.q.why}</p>
          </div>
        )}
      </div>
      {answered && (
        <div className="bottom-action">
          <button className="btn primary wide" onClick={next} autoFocus>
            {i + 1 < items.length ? 'Sonraki soru' : 'Sonucu gör'}
          </button>
        </div>
      )}
    </>
  );
}

function Result({ right, total, children }: { right: number; total: number; children: React.ReactNode }) {
  const pct = total ? right / total : 0;
  const msg = pct === 1 ? 'Hepsi doğru. Harika iş.' : pct >= 0.7 ? 'İyi gidiyorsun.' : 'Dersi bir kez daha okumak iyi olur.';
  return (
    <div className="result">
      <div className={pct === 1 ? 'score full' : 'score'}>
        <strong>
          {right}/{total}
        </strong>
        <span>doğru</span>
      </div>
      <h2>{msg}</h2>
      {right < total && <p className="muted">Yanlış yaptığın sorular “Tekrar” bölümüne eklendi.</p>}
      <div className="result-actions">{children}</div>
    </div>
  );
}

function LessonQuiz({ id }: { id: string }) {
  const { lesson, module } = findLesson(id)!;
  const idx = ALL_LESSONS.findIndex((x) => x.lesson.id === id);
  const next = ALL_LESSONS[idx + 1];
  return (
    <Quiz
      questions={lesson.quiz}
      title="Test"
      back={`ders-${id}`}
      backLabel="Ders"
      onFinish={(r, w) => saveQuiz(id, r.length, lesson.quiz.length, w, r)}
      finish={(right, total) => (
        <>
          <NavBar back={`modul-${module.id}`} backLabel={module.title} />
          <Result right={right} total={total}>
            {next && (
              <a className="btn primary wide" href={`#ders-${next.lesson.id}`}>
                Sonraki ders: {next.lesson.title}
              </a>
            )}
            <a className="btn wide" href={`#ders-${id}`}>
              Dersi tekrar oku
            </a>
            <a className="btn plain wide" href="#">
              Ana sayfa
            </a>
          </Result>
        </>
      )}
    />
  );
}

function ReviewQuiz({ s }: { s: State }) {
  // Oturum başındaki listeyi sabitle; cevaplandıkça liste değişse de test bozulmasın.
  const [ids] = useState(() => dueReviews(s));
  const qs = useMemo(() => ids.map((id) => findQuestion(id)).filter((q): q is Question => !!q), [ids]);
  if (!qs.length)
    return (
      <>
        <NavBar back="" backLabel="Bugün" />
        <div className="empty">
          <span className="tile big tint-green"><Icon name="repeat" size={28} /></span>
          <h2>Tekrar bekleyen soru yok</h2>
          <p className="muted">Testlerde yanlış yaptığın sorular buraya gelir. İki kez doğru bildiğin soru listeden çıkar.</p>
          <a className="btn primary" href="#hizli-test">Hızlı test çöz</a>
        </div>
      </>
    );
  return (
    <Quiz
      questions={qs}
      title="Tekrar"
      back=""
      backLabel="Bugün"
      onAnswer={(q, ok) => answerReview(q.id, ok)}
      finish={(right, total) => (
        <>
          <NavBar back="" backLabel="Bugün" />
          <Result right={right} total={total}>
            <a className="btn primary wide" href="#">Ana sayfa</a>
          </Result>
        </>
      )}
    />
  );
}

function QuickQuiz() {
  const [round, setRound] = useState(0);
  return <QuickRound key={round} onAgain={() => { setRound(round + 1); window.scrollTo(0, 0); }} />;
}

function QuickRound({ onAgain }: { onAgain: () => void }) {
  const [qs] = useState(() => shuffle(ALL_QUESTIONS).slice(0, 10).map((x) => x.q));
  return (
    <Quiz
      questions={qs}
      title="Hızlı test"
      back=""
      backLabel="Bugün"
      onFinish={(_r, w) => w.forEach((id) => answerReview(id, false))}
      finish={(right, total) => (
        <>
          <NavBar back="" backLabel="Bugün" />
          <Result right={right} total={total}>
            <button className="btn primary wide" onClick={onAgain}>
              Yeni hızlı test
            </button>
            <a className="btn plain wide" href="#">Ana sayfa</a>
          </Result>
        </>
      )}
    />
  );
}

/* ---------- Kontrol listesi ---------- */

function CheckPage({ s }: { s: State }) {
  const check = todaysCheck(s);
  const total = CHECKLIST.reduce((n, g) => n + g.items.length, 0);
  const done = check.done.length;
  const finishedAt = 'finishedAt' in check ? check.finishedAt : undefined;
  return (
    <>
      <LargeTitle title="Kontrol" sub="Vardiya öncesi araç kontrolü (Abfahrtskontrolle)" />
      <section className={done === total ? 'card check-head complete' : 'card check-head'}>
        <div>
          <strong>{done === total ? 'Araç kontrolü tamam' : `${done}/${total} madde`}</strong>
          <span className="muted">{done === total ? `Bugün ${finishedAt ?? ''} itibarıyla. İyi yolculuklar.` : 'Liste her gün sıfırlanır.'}</span>
        </div>
        <Progress value={done / total} label="Kontrol ilerlemesi" />
      </section>
      {CHECKLIST.map((g) => (
        <section key={g.title}>
          <h3 className="section-label">{g.title}</h3>
          <ul className="list card">
            {g.items.map((it) => {
              const on = check.done.includes(it.id);
              return (
                <li key={it.id}>
                  <button className={on ? 'row check on' : 'row check'} onClick={() => toggleCheck(it.id, total)} aria-pressed={on}>
                    <span className="checkbox" aria-hidden="true">
                      <svg viewBox="0 0 24 24" width="16" height="16">
                        <path d="m6 12.5 4 4 8-9" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </span>
                    <span className="row-main">
                      <span className="row-title">{it.label}</span>
                      {it.hint && <span className="row-sub">{it.hint}</span>}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
      <p className="footnote">
        Bir sorun bulursan yola çıkmadan önce fotoğraflayıp filo sorumlusuna bildir.{' '}
        {done > 0 && (
          <button className="link" onClick={resetCheck}>
            Listeyi sıfırla
          </button>
        )}
      </p>
    </>
  );
}

/* ---------- Sözlük ---------- */

const norm = (x: string) =>
  x.toLocaleLowerCase('tr').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/ı/g, 'i').replace(/ß/g, 'ss');

function GlossaryPage() {
  const [q, setQ] = useState('');
  const list = useMemo(() => {
    const n = norm(q.trim());
    return n ? GLOSSARY.filter((t) => norm(t.de).includes(n) || norm(t.tr).includes(n)) : GLOSSARY;
  }, [q]);
  return (
    <>
      <LargeTitle title="Sözlük" sub={`${GLOSSARY.length} Almanca terim ve kalıp`} />
      <div className="search">
        <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
          <circle cx="11" cy="11" r="6.5" fill="none" stroke="currentColor" strokeWidth="2" />
          <path d="m16 16 4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
        <input id="sozluk-ara" type="search" placeholder="Almanca veya Türkçe ara" value={q} onChange={(e) => setQ(e.target.value)} autoComplete="off" />
        {q && (
          <button className="clear" onClick={() => setQ('')} aria-label="Aramayı temizle">
            <Icon name="close" size={14} />
          </button>
        )}
      </div>
      {list.length ? (
        <ul className="list card">
          {list.map((t) => (
            <li key={t.de}>
              <a href={`#ders-${t.lessonId}`} className="row">
                <span className="row-main">
                  <span className="row-title" lang="de">{t.de}</span>
                  <span className="row-sub">{t.tr}</span>
                </span>
                <Icon name="chevron" size={18} />
              </a>
            </li>
          ))}
        </ul>
      ) : (
        <p className="footnote">“{q}” için sonuç yok.</p>
      )}
    </>
  );
}

/* ---------- Hakkında ---------- */

function About() {
  const [confirm, setConfirm] = useState(false);
  const [cleared, setCleared] = useState(false);
  return (
    <>
      <NavBar back="" backLabel="Bugün" />
      <LargeTitle title="Hakkında" />
      <section className="card prose">
        <p>
          Bu uygulama Almanya’da van ile paket dağıtan şoförler için hazırlanmış bağımsız bir eğitim aracıdır. Herhangi bir kargo veya e-ticaret şirketiyle bağlantısı yoktur.
        </p>
        <p>İlerlemen sadece bu cihazdaki tarayıcıda saklanır. Bağlantıyı açan herkes kendi ilerlemesiyle bağımsız olarak kullanır. Hesap gerekmez.</p>
      </section>

      <h3 className="section-label">Önemli not</h3>
      <section className="card prose">
        <p>
          İçerik {CONTENT_REVIEWED} itibarıyla gözden geçirilmiştir. Trafik kuralları ve ceza tutarları değişebilir. Bu uygulama hukuki danışmanlık değildir. Şüphede kalırsan resmi kaynaklara, işverenine veya polise danış.
        </p>
      </section>

      <h3 className="section-label">Resmi kaynaklar</h3>
      <ul className="list card">
        {[
          ['Straßenverkehrs-Ordnung (StVO)', 'https://www.gesetze-im-internet.de/stvo_2013/'],
          ['Bußgeldkatalog (KBA)', 'https://www.kba.de/DE/Themen/ZentraleRegister/FAER/BT_KAT_OWI/btkat_node.html'],
          ['Arbeitszeitgesetz', 'https://www.gesetze-im-internet.de/arbzg/'],
          ['DGUV Vorschrift 70 (Fahrzeuge)', 'https://publikationen.dguv.de/regelwerk/dguv-vorschriften/'],
          ['ADAC Ratgeber', 'https://www.adac.de/verkehr/recht/'],
        ].map(([t, u]) => (
          <li key={u}>
            <a className="row" href={u} target="_blank" rel="noreferrer">
              <span className="row-main">
                <span className="row-title" lang="de">{t}</span>
                <span className="row-sub">{new URL(u).hostname}</span>
              </span>
              <Icon name="chevron" size={18} />
            </a>
          </li>
        ))}
      </ul>

      <h3 className="section-label">Veriler</h3>
      <section className="card prose">
        {cleared ? (
          <p>İlerleme silindi.</p>
        ) : confirm ? (
          <>
            <p>Tüm ders sonuçları, tekrar soruları ve kontrol listesi bu cihazdan silinecek. Bu geri alınamaz.</p>
            <div className="btn-row">
              <button className="btn" onClick={() => setConfirm(false)}>
                Vazgeç
              </button>
              <button
                className="btn danger"
                onClick={() => {
                  resetAll();
                  setCleared(true);
                }}
              >
                Sil
              </button>
            </div>
          </>
        ) : (
          <button className="link danger-text" onClick={() => setConfirm(true)}>
            İlerlemeyi sıfırla
          </button>
        )}
      </section>
    </>
  );
}

/* ---------- İşaretler ---------- */

function SignQuiz() {
  const [round, setRound] = useState(0);
  return <SignRound key={round} onAgain={() => { setRound(round + 1); window.scrollTo(0, 0); }} />;
}

function SignRound({ onAgain }: { onAgain: () => void }) {
  const [qs] = useState(() => signTest(12));
  return (
    <Quiz
      questions={qs}
      title="İşaret testi"
      back="isaretler"
      backLabel="İşaretler"
      onFinish={(r, w) => saveSignTest(r.length, qs.length, w)}
      finish={(right, total) => (
        <>
          <NavBar back="isaretler" backLabel="İşaretler" />
          <Result right={right} total={total}>
            <button className="btn primary wide" onClick={onAgain}>
              Yeni işaret testi
            </button>
            <a className="btn wide" href="#isaretler">Tüm işaretlere bak</a>
          </Result>
        </>
      )}
    />
  );
}

function SignsPage({ s }: { s: State }) {
  const [open, setOpen] = useState<SignId | null>(null);
  return (
    <>
      <LargeTitle title="İşaretler" sub={`${SIGNS.length} işaret · teslimatta en sık karşılaşılanlar`} />
      <section className="card hero">
        <div className="eyebrow">İşaret testi</div>
        <h2>Her seferinde karışık 12 soru</h2>
        <p className="muted">
          Bazen işareti görüp anlamını seçersin, bazen anlamı okuyup doğru işareti bulursun.
          {s.signBest ? ` En iyi sonucun ${s.signBest.best}/${s.signBest.total}.` : ''}
        </p>
        <div className="hero-foot">
          <span className="meta">
            <Icon name="clock" size={16} /> yaklaşık 3 dk
          </span>
          <a className="btn primary" href="#isaret-testi">Teste başla</a>
        </div>
      </section>
      {CATEGORIES.map((c) => (
        <section key={c.id}>
          <h3 className="section-label">{c.title}</h3>
          <p className="cat-hint">{c.hint}</p>
          <ul className="list card">
            {SIGNS.filter((x) => x.cat === c.id).map((x) => {
              const on = open === x.id;
              return (
                <li key={x.id}>
                  <button className="row sign-row" onClick={() => setOpen(on ? null : x.id)} aria-expanded={on}>
                    <span className="sign-cell">
                      <Sign id={x.id} size={isWide(x.id) ? 72 : 52} />
                    </span>
                    <span className="row-main">
                      <span className="row-title">{x.tr}</span>
                      <span className="row-sub" lang="de">{x.de}</span>
                      {on && <span className="sign-desc">{x.desc}</span>}
                    </span>
                    <span className={on ? 'disclosure on' : 'disclosure'}>
                      <Icon name="chevron" size={18} />
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
      <p className="footnote">Çizimler sadeleştirilmiştir. Yoldaki gerçek tabelalar ayrıntıda biraz farklı görünebilir.</p>
    </>
  );
}

/* ---------- Senaryolar ---------- */

function scenSummary(s: State) {
  const done = SENARYOLAR.filter((x) => s.scen?.[x.id] !== undefined).length;
  const ok = SENARYOLAR.filter((x) => s.scen?.[x.id]).length;
  return done ? `${ok}/${SENARYOLAR.length} doğru · çizimli sokak durumları` : `${SENARYOLAR.length} çizimli sokak durumu: nereye durursun?`;
}

function ScenarioRows({ s, list }: { s: State; list: Scenario[] }) {
  return (
    <ul className="list card">
      {list.map((x, i) => {
        const r = s.scen?.[x.id];
        return (
          <li key={x.id}>
            <a href={`#senaryo-${x.id}`} className="row">
              <span className="num">{i + 1}</span>
              <span className="row-main">
                <span className="row-title">{x.title}</span>
                <span className="row-sub">{x.situation}</span>
              </span>
              {r === undefined ? (
                <span className="status" aria-label="Çözülmedi" />
              ) : (
                <span className={r ? 'status full' : 'status done'} aria-label={r ? 'İlk denemede doğru' : 'İlk denemede yanlış'}>
                  {r ? '✓' : '✗'}
                </span>
              )}
              <Icon name="chevron" size={18} />
            </a>
          </li>
        );
      })}
    </ul>
  );
}

function ScenarioList({ s }: { s: State }) {
  const next = SENARYOLAR.find((x) => s.scen?.[x.id] === undefined) ?? SENARYOLAR[0];
  return (
    <>
      <NavBar back="" backLabel="Bugün" />
      <LargeTitle title="Senaryolar" sub="Durma ve park · yukarıdan bakış sokak çizimleri" />
      <section className="card hero">
        <div className="eyebrow">Nasıl çalışır?</div>
        <p className="muted">
          Her sahnede A, B, C ve D ile işaretli olası durma yerleri var. Sahnede bir yere ya da aşağıdaki seçeneklerden birine dokun. Sonra her seçeneğin neden doğru ya da yanlış olduğunu görürsün.
        </p>
        <div className="hero-foot">
          <span className="meta">Çizimlerde yaklaşık 1 araç boyu = 4,5 m</span>
          <a className="btn primary" href={`#senaryo-${next.id}`}>Başla</a>
        </div>
      </section>
      <ScenarioRows s={s} list={SENARYOLAR} />
    </>
  );
}

function ScenarioPage({ id }: { id: string }) {
  const idx = SENARYOLAR.findIndex((x) => x.id === id);
  const sc = SENARYOLAR[idx];
  const next = SENARYOLAR[idx + 1];
  const [pick, setPick] = useState<Spot['id'] | null>(null);
  const answered = pick !== null;
  const chosen = sc.spots.find((x) => x.id === pick);

  const choose = (spotId: Spot['id']) => {
    if (answered) return;
    setPick(spotId);
    saveScenario(sc.id, !!sc.spots.find((x) => x.id === spotId)?.ok);
  };

  const states: Record<string, SpotState> = {};
  for (const sp of sc.spots) states[sp.id] = !answered ? 'idle' : sp.ok ? 'right' : sp.id === pick ? 'picked-wrong' : 'wrong';

  return (
    <>
      <NavBar back="senaryolar" backLabel="Senaryolar" />
      <div className="scenario">
        <div className="eyebrow">
          Senaryo {idx + 1}/{SENARYOLAR.length} · Durma ve park
        </div>
        <h1>{sc.title}</h1>
        <p className="situation">{sc.situation}</p>
        <div className="scene-card">
          <Scene els={sc.scene} spots={sc.spots} states={states} onPick={choose} label={`Sokak çizimi: ${sc.situation}`} />
        </div>
        <h2 className="question">{sc.question}</h2>
        {!answered ? (
          <div className="options">
            {sc.spots.map((sp) => (
              <button key={sp.id} className="option" onClick={() => choose(sp.id)}>
                <span className="opt-letter">{sp.id}</span>
                <span>{sp.label}</span>
              </button>
            ))}
          </div>
        ) : (
          <>
            <div className={chosen?.ok ? 'feedback ok' : 'feedback no'} role="status">
              <strong>{chosen?.ok ? 'Doğru' : 'Yanlış'}</strong>
              <p>
                {chosen?.ok
                  ? chosen.why
                  : `Doğru cevap ${sc.spots.find((x) => x.ok)?.id}: ${sc.spots.find((x) => x.ok)?.label.toLocaleLowerCase('tr')}. Her seçeneğin açıklaması aşağıda.`}
              </p>
            </div>
            <ul className="verdicts card">
              {sc.spots.map((sp) => (
                <li key={sp.id} className={sp.ok ? 'ok' : ''}>
                  <span className={sp.ok ? 'verdict-badge ok' : 'verdict-badge'}>{sp.id}</span>
                  <div>
                    <strong>{sp.label}</strong>
                    <p>{sp.why}</p>
                  </div>
                </li>
              ))}
            </ul>
            <aside className="callout law">
              <div className="callout-label">Kural</div>
              <p>{sc.rule}</p>
            </aside>
          </>
        )}
      </div>
      {answered && (
        <div className="bottom-action">
          {next ? (
            <a className="btn primary wide" href={`#senaryo-${next.id}`}>
              Sonraki senaryo
            </a>
          ) : (
            <a className="btn primary wide" href="#senaryolar">
              Bitir
            </a>
          )}
        </div>
      )}
    </>
  );
}
