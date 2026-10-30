import { useEffect, useState } from 'react';
import { LiveIndicator } from './present/Actions';
import { parseDeckHash, SCREEN_HASH } from './present/links';
import { DeckPage, ScreenView } from './present/Screen';
import { buildSample } from './sample';
import { useStore } from './store';
import { Btn, Icon, Toasts } from './ui';
import { Dashboard } from './views/Dashboard';
import { Library } from './views/Library';
import { Matches } from './views/Matches';
import { SettingsView } from './views/Settings';
import { Squad } from './views/Squad';
import { TacticBoard } from './views/TacticBoard';
import { Training } from './views/Training';

// Görünümler adres çubuğundaki #ad ile açılır: #panel, #taktik, #taktik-<id>, #kutuphane, #kutuphane-<id>, #antrenman, #maclar, #mac-<id>, #kadro, #ayarlar
// TV ve sunum: #ekran (TV bekleme/yayın ekranı), #sunum-<tür>-<id> (doğrudan tam ekran sunum)

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
  const { data, mode, canEdit, isEmpty, replaceAll, sharedUnavailable } = useStore();
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

  // TV ekranı ve doğrudan sunum bağlantıları menüsüz, tam ekran açılır
  if (route === SCREEN_HASH)
    return (
      <>
        <ScreenView />
        <Toasts />
      </>
    );
  const deckTarget = parseDeckHash(route);
  if (deckTarget)
    return (
      <>
        <DeckPage target={deckTarget} onExit={() => go('panel')} />
        <Toasts />
      </>
    );

  const [section, id] = route.startsWith('taktik-')
    ? ['taktik', route.slice(7)]
    : route.startsWith('mac-')
      ? ['maclar', route.slice(4)]
      : route.startsWith('kutuphane-')
        ? ['kutuphane', route.slice(10)]
        : [route, undefined];
  const navSection = section === 'kutuphane' ? 'taktik' : section;

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
      case 'kutuphane':
        view = <Library openId={id} onOpen={(x) => go(x ? 'kutuphane-' + x : 'kutuphane')} onOpenTactic={(x) => go('taktik-' + x)} />;
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
          <a key={n.id} href={'#' + n.id} className={'nav-item' + (navSection === n.id ? ' on' : '')} aria-current={navSection === n.id ? 'page' : undefined}>
            <Icon name={n.icon} size={22} />
            <span>{n.label}</span>
          </a>
        ))}
        <div className="rail-foot">
          {!canEdit && <span className="badge">İzleme</span>}
          {mode === 'local' && <span className="badge" title="Veriler bu tarayıcıda saklanıyor">Bu cihaz</span>}
        </div>
      </nav>
      <main className="main">
        {sharedUnavailable && (
          <div className="conn-banner" role="alert">
            <strong>Takım verilerine bağlanılamadı.</strong> Bu tarayıcıda claude.ai oturumu açık değil ya da bu hesabın uygulamaya erişimi yok. Şu an bu cihazda kayıtlı veriler gösteriliyor; burada yapılan değişiklikler takımla paylaşılmaz.
          </div>
        )}
        {view}
      </main>
      <LiveIndicator />
      <Toasts />
    </div>
  );
}
