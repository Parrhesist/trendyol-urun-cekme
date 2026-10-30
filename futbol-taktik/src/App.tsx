import { useEffect, useState } from 'react';
import { buildSample } from './sample';
import { useStore } from './store';
import { Btn, Icon, Toasts } from './ui';
import { Dashboard } from './views/Dashboard';
import { Matches } from './views/Matches';
import { SettingsView } from './views/Settings';
import { Squad } from './views/Squad';
import { TacticBoard } from './views/TacticBoard';
import { Training } from './views/Training';

// Görünümler adres çubuğundaki #ad ile açılır: #panel, #taktik, #taktik-<id>, #antrenman, #maclar, #mac-<id>, #kadro, #ayarlar

const NAV = [
  { id: 'panel', label: 'Panel', icon: 'home' },
  { id: 'taktik', label: 'Taktik', icon: 'board' },
  { id: 'antrenman', label: 'Antrenman', icon: 'calendar' },
  { id: 'maclar', label: 'Maçlar', icon: 'whistle' },
  { id: 'kadro', label: 'Kadro', icon: 'users' },
  { id: 'ayarlar', label: 'Ayarlar', icon: 'gear' },
];

const readHash = () => location.hash.replace(/^#/, '') || 'panel';

export function App() {
  const { data, mode, canEdit, isEmpty, replaceAll } = useStore();
  const [route, setRoute] = useState(readHash);
  // maçtan açılan taktikte "geri" maça döner
  const [returnTo, setReturnTo] = useState<string | null>(null);
  useEffect(() => {
    if (!route.startsWith('taktik-')) setReturnTo(null);
  }, [route]);
  useEffect(() => {
    const h = () => {
      setRoute(readHash());
      window.scrollTo(0, 0);
    };
    window.addEventListener('hashchange', h);
    return () => window.removeEventListener('hashchange', h);
  }, []);
  const go = (r: string) => {
    location.hash = r;
  };

  const [section, id] = route.startsWith('taktik-') ? ['taktik', route.slice(7)] : route.startsWith('mac-') ? ['maclar', route.slice(4)] : [route, undefined];

  let view;
  if (mode === 'loading')
    view = (
      <div className="page loading">
        <div className="spinner" aria-hidden="true" />
        <p className="muted">Takım verileri yükleniyor…</p>
      </div>
    );
  else if (isEmpty)
    view = (
      <div className="page onboarding">
        <p className="eyebrow">Hoş geldiniz</p>
        <h1>Taktik tahtanız hazır</h1>
        {canEdit ? (
          <>
            <p>Kadronuzu, taktiklerinizi, antrenman planınızı ve maç değerlendirmelerinizi burada tutacaksınız. Oyuncularınızla paylaştığınızda aynı verileri görürler ama değiştiremezler.</p>
            <div className="row">
              <Btn variant="primary" size="lg" onClick={() => replaceAll(buildSample())}>
                Örnek takımla başla
              </Btn>
              <Btn size="lg" onClick={() => go('kadro')}>
                Boş başla, kadromu gireyim
              </Btn>
            </div>
          </>
        ) : (
          <p>Antrenörünüz henüz içerik eklemedi.</p>
        )}
      </div>
    );
  else
    switch (section) {
      case 'taktik':
        view = (
          <TacticBoard
            openId={id}
            backLabel={returnTo ? 'Maça dön' : undefined}
            onOpen={(x) => {
              if (!x && returnTo) go(returnTo);
              else go(x ? 'taktik-' + x : 'taktik');
            }}
          />
        );
        break;
      case 'antrenman':
        view = <Training onOpenTactic={(x) => go('taktik-' + x)} />;
        break;
      case 'maclar':
        view = (
          <Matches
            openId={id}
            onOpen={(x) => go(x ? 'mac-' + x : 'maclar')}
            onOpenTactic={(tid, mid) => {
              setReturnTo('mac-' + mid);
              go('taktik-' + tid);
            }}
          />
        );
        break;
      case 'kadro':
        view = <Squad />;
        break;
      case 'ayarlar':
        view = <SettingsView />;
        break;
      default:
        view = <Dashboard go={go} />;
    }

  return (
    <div className="app" style={{ '--us': data.settings.homeColor, '--them': data.settings.awayColor } as React.CSSProperties}>
      <nav className="rail" aria-label="Ana menü">
        <div className="brand">
          <span className="crest" style={{ background: data.settings.homeColor }}>
            {data.settings.shortName.slice(0, 3)}
          </span>
        </div>
        {NAV.filter((n) => canEdit || n.id !== 'ayarlar').map((n) => (
          <a key={n.id} href={'#' + n.id} className={'nav-item' + (section === n.id ? ' on' : '')} aria-current={section === n.id ? 'page' : undefined}>
            <Icon name={n.icon} size={22} />
            <span>{n.label}</span>
          </a>
        ))}
        <div className="rail-foot">
          {!canEdit && <span className="badge">İzleme</span>}
          {mode === 'local' && <span className="badge" title="Veriler bu tarayıcıda saklanıyor">Bu cihaz</span>}
        </div>
      </nav>
      <main className="main">{view}</main>
      <Toasts />
    </div>
  );
}
