import { useEffect, useRef, useState } from 'react';
import { QR } from '../components/QR';
import { useStore } from '../store';
import { Btn, copyText, Icon, Modal, toggleFullscreen } from '../ui';
import { useDeck } from './decks';
import { appBase, deckHash, linkFor, SCREEN_HASH, type DeckTarget } from './links';
import { useLive, type DeckState } from './live';
import { Presenter } from './Presenter';

const FRESH: DeckState = { slide: 0, step: 0, play: 0, timer: null };

/** Sunum ve Ekrana yansıt düğmeleri: taktik, maç ve antrenman ekranlarında aynı */
export function PresentActions({ target, label = 'Sunum', size = 'lg', disabled }: { target: DeckTarget; label?: string; size?: 'sm' | 'md' | 'lg'; disabled?: boolean }) {
  const [open, setOpen] = useState<null | { cast: boolean }>(null);
  const [modal, setModal] = useState(false);
  return (
    <>
      <Btn variant="primary" icon="present" size={size} disabled={disabled} onClick={() => setOpen({ cast: false })}>
        {label}
      </Btn>
      <Btn icon="cast" size={size} disabled={disabled} onClick={() => setModal(true)}>
        Ekrana yansıt
      </Btn>
      {modal && (
        <CastModal
          target={target}
          onClose={() => setModal(false)}
          onStart={(cast) => {
            setModal(false);
            setOpen({ cast });
          }}
        />
      )}
      {open && <PresentOverlay target={target} startCasting={open.cast} onClose={() => setOpen(null)} />}
    </>
  );
}

/** Uygulama içinde tam ekran sunum; istenirse bağlı TV ekranlarına canlı yansıtır */
export function PresentOverlay({ target, startCasting, onClose }: { target: DeckTarget; startCasting: boolean; onClose: () => void }) {
  const deck = useDeck(target);
  const live = useLive();
  const resuming = !!(live.live?.active && live.live.kind === target.kind && live.live.id === target.id);
  const initial: DeckState = resuming && live.live ? { slide: live.live.slide, step: live.live.step, play: 0, timer: live.live.timer ?? null } : FRESH;
  const [st, setSt] = useState<DeckState>(initial);
  const stRef = useRef(st);
  const [casting, setCasting] = useState(startCasting || resuming);
  const castingRef = useRef(casting);

  const push = (s: DeckState) => live.send({ ...s, active: true, kind: target.kind, id: target.id, at: Date.now() });
  useEffect(() => {
    if (startCasting && live.canCast) push(stRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onChange = (patch: Partial<DeckState>) => {
    const next = { ...stRef.current, ...patch };
    stRef.current = next;
    setSt(next);
    if (castingRef.current) push(next);
  };
  const startCast = () => {
    castingRef.current = true;
    setCasting(true);
    push(stRef.current);
  };
  const stopCast = () => {
    castingRef.current = false;
    setCasting(false);
    live.stop();
  };

  if (!deck) return null;
  const status = live.acked
    ? `TV aldı (${live.screenList.filter((x) => x.ack === live.live?.at).map((x) => x.name).join(', ') || 'ekran'})`
    : live.screens
      ? `${live.screens} ekran bağlı`
      : live.screens === 0
        ? 'bağlı ekran görünmüyor; TV açılınca sunum gelir'
        : '';
  const castBar = live.canCast ? (
    casting ? (
      <div className={'cast-bar on' + (live.acked ? ' acked' : '')}>
        <span className="live-dot" aria-hidden="true" />
        <span>
          TV'de yayında
          {status && <small> · {status}</small>}
        </span>
        <Btn size="sm" variant="ghost" onClick={stopCast}>
          Bitir
        </Btn>
      </div>
    ) : (
      <Btn size="sm" icon="cast" onClick={startCast}>
        TV'ye gönder
        {live.screens ? ` (${live.screens})` : ''}
      </Btn>
    )
  ) : null;
  return <Presenter deck={deck} state={st} onChange={onChange} mode="overlay" onClose={onClose} castBar={castBar} />;
}

export function LinkBox({ link, id }: { link: string; id: string }) {
  const { toast } = useStore();
  const ref = useRef<HTMLElement>(null);
  return (
    <div className="share-box">
      <code ref={ref} id={id}>
        {link}
      </code>
      <Btn
        icon="copy"
        onClick={async () => {
          const ok = await copyText(link, ref.current);
          toast(ok ? 'Bağlantı kopyalandı' : 'Bağlantı seçildi, kopyalayabilirsiniz');
        }}
      >
        Kopyala
      </Btn>
    </div>
  );
}

type Platform = 'ios' | 'android' | 'mac' | 'windows' | 'other';

const detectPlatform = (): Platform => {
  const ua = navigator.userAgent;
  if (/iPad|iPhone|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1)) return 'ios';
  if (/Android/.test(ua)) return 'android';
  if (/Macintosh/.test(ua)) return 'mac';
  if (/Windows/.test(ua)) return 'windows';
  return 'other';
};

/** Cihazın kendi ekran yansıtma özelliği: TV'yi cihaz bulur, uygulamada kurulum gerekmez */
const MIRROR: { id: Platform; device: string; steps: string[] }[] = [
  {
    id: "ios",
    device: "iPad / iPhone (AirPlay)",
    steps: ["Ekranın sağ üst köşesinden aşağı kaydırıp Denetim Merkezi'ni açın.", "Ekran Yansıtma'ya dokunun, listeden TV'nizi seçin (Apple TV ya da AirPlay destekli Samsung, LG, Sony, Philips TV'ler).", "TV'de çıkan kodu girin, sonra burada “Tam ekran başlat” deyin."],
  },
  {
    id: "android",
    device: "Android telefon / tablet",
    steps: ["Ekranın üstünden iki kez aşağı kaydırıp hızlı ayarları açın.", "“Smart View” (Samsung), “Ekran yansıtma” ya da “Yayınla” düğmesine dokunun, TV'nizi seçin. Chromecast ve Google TV için Google Home uygulamasından “Ekranımı yayınla” da kullanılabilir.", "Yansıtma başlayınca burada “Tam ekran başlat” deyin."],
  },
  {
    id: "mac",
    device: "Mac",
    steps: ["Menü çubuğunda Denetim Merkezi → Ekran Yansıtma → TV'nizi seçin (AirPlay).", "Ya da HDMI kablosu takın.", "Burada “Tam ekran başlat” deyin."],
  },
  {
    id: "windows",
    device: "Windows bilgisayar",
    steps: ["Windows tuşu + K'ye basın, listeden TV'nizi seçin (Miracast). Chromecast için Chrome'da ⋮ menü → Yayınla.", "Ya da HDMI kablosu takın.", "Burada “Tam ekran başlat” deyin."],
  },
];

/** Ekrana yansıtmanın üç yolu: cihazı yansıtma, TV tarayıcısı ile bağlı ekran, doğrudan bağlantı */
export function CastModal({ target, onClose, onStart }: { target: DeckTarget; onClose: () => void; onStart: (cast: boolean) => void }) {
  const { data, mode } = useStore();
  const deck = useDeck(target);
  const live = useLive();
  const hasBase = !!appBase(data.settings);
  const screenLink = linkFor(data.settings, SCREEN_HASH);
  const deckLink = linkFor(data.settings, deckHash(target));
  const platform = detectPlatform();
  const mine = MIRROR.find((x) => x.id === platform);
  const others = MIRROR.filter((x) => x.id !== platform);
  return (
    <Modal title="Ekrana yansıt" onClose={onClose} wide>
      <p className="muted">
        <strong>{deck?.title}</strong> · {deck?.slides.length} slayt
      </p>
      <div className="cast-options">
        <section className="cast-card primary">
          <h3>
            <Icon name="present" /> Aynı Wi-Fi'deki TV'ye yansıt <span className="pill pill-good">Önerilen</span>
          </h3>
          <p>Tablet, telefon ya da bilgisayarınız aynı Wi-Fi'deki TV'leri kendisi bulur (AirPlay, Smart View, Chromecast, Miracast). Uygulamada kurulum, TV'de giriş gerekmez.</p>
          {mine && (
            <div className="mirror-steps">
              <strong>{mine.device}</strong>
              <ol className="steps">
                {mine.steps.map((x) => (
                  <li key={x}>{x}</li>
                ))}
              </ol>
            </div>
          )}
          <Btn
            variant="primary"
            size="lg"
            onClick={() => {
              toggleFullscreen();
              onStart(false);
            }}
          >
            Tam ekran başlat
          </Btn>
          <details open={!mine}>
            <summary>TV listede çıkmıyorsa</summary>
            <ul className="steps">
              <li>Cihaz ile TV aynı Wi-Fi ağında olmalı. Misafir ağı (guest) ve bazı kurum ağları cihazların birbirini görmesini engeller.</li>
              <li>TV açık olmalı (bekleme modunda değil) ve TV'de yansıtma açık olmalı: Samsung'da Ayarlar → Genel → Apple AirPlay Ayarları; LG'de ana ekranda AirPlay → Açık; Chromecast ve Google TV'de ek ayar gerekmez.</li>
              <li>VPN açıksa kapatın; Wi-Fi'yi kapatıp açmak listeyi yeniler.</li>
              <li>TV yansıtmayı desteklemiyorsa HDMI kablosu ya da Chromecast cihazı kullanın.</li>
            </ul>
          </details>
          <details open={!mine}>
            <summary>{mine ? 'Diğer cihazlar' : 'Cihazınıza göre adımlar'}</summary>
            {others.map((o) => (
              <div key={o.id} className="mirror-steps">
                <strong>{o.device}</strong>
                <ol className="steps">
                  {o.steps.map((x) => (
                    <li key={x}>{x}</li>
                  ))}
                </ol>
              </div>
            ))}
          </details>
        </section>

        {live.canCast && (
          <section className="cast-card">
            <h3>
              <Icon name="cast" /> TV'nin tarayıcısı ile bağlı ekran
            </h3>
            <p>Tablet kumanda olur: slayt, taktik adımı ve süre TV'de aynı anda ilerler. TV'de uygulamanın bir kez açılmış olması gerekir.</p>
            <div className={'screen-status ' + (live.screens ? 'ok' : 'none')} role="status">
              <span className={'live-dot' + (live.screens ? ' idle' : ' off')} aria-hidden="true" />
              {live.screens ? (
                <span>
                  Bağlı ekranlar: <strong>{live.screenList.map((x) => x.name).join(', ')}</strong>
                </span>
              ) : (
                <span>Şu an bağlı ekran görünmüyor. Yine de gönderebilirsiniz: TV'de ekran açıldığı an sunum gelir.</span>
              )}
            </div>
            <Btn size="lg" icon="cast" onClick={() => onStart(true)}>
              TV'ye gönder ve sunumu başlat
            </Btn>
            <details open={!live.screens}>
              <summary>TV'yi bağlama (bir kez)</summary>
              <ol className="steps">
                {mode === 'shared' ? (
                  <>
                    <li>TV'nin internet tarayıcısında claude.ai'yi açın ve uygulamayı açabilen bir hesapla giriş yapın (en kolayı sizin hesabınız).</li>
                    <li>
                      Saha Kenarı uygulamasını açın (claude.ai'de son kullanılanlarda ya da yer imi olarak) ve ana sayfadaki <strong>Bu cihazı TV ekranı yap</strong> düğmesine basın. Ya da doğrudan bu adresi açın:
                    </li>
                    <LinkBox link={screenLink} id="cast-screen-link" />
                    <li>TV'de “ekran olarak bağlı ve hazır” yazısı çıkınca burada ekranın adı görünür.</li>
                  </>
                ) : (
                  <>
                    <li>Bu bilgisayarı TV'ye HDMI ile bağlayın (genişletilmiş ekran).</li>
                    <li>Yeni bir tarayıcı penceresinde şu adresi açıp pencereyi TV ekranına taşıyın:</li>
                    <LinkBox link={screenLink} id="cast-screen-link" />
                  </>
                )}
              </ol>
              {mode === 'shared' && <p className="hint">TV başka bir hesapla açıldıysa listede görünmeyebilir ama gönderilen sunumu yine de gösterir. TV giriş yapamıyorsa yukarıdaki yansıtma yolunu kullanın.</p>}
            </details>
          </section>
        )}

        <section className="cast-card">
          <h3>
            <Icon name="share" /> Doğrudan bağlantı
          </h3>
          <p>Akıllı TV tarayıcısında, Chromecast'e yayınlanan Chrome sekmesinde ya da oyuncuların telefonunda bu sunumu doğrudan, tam ekran açar.</p>
          <div className="cast-link">
            <LinkBox link={deckLink} id="cast-deck-link" />
            {hasBase && <QR text={deckLink} size={132} label="Sunum bağlantısı QR kodu" />}
          </div>
          {!hasBase && <p className="hint">Tam adres oluşturmak için Ayarlar → TV ve ekranlar bölümüne uygulamanın bağlantısını girin.</p>}
          {mode === 'shared' && <p className="hint">Bağlantıyı açan kişinin claude.ai'de giriş yapmış olması ve uygulamaya erişimi olmalı.</p>}
        </section>
      </div>
    </Modal>
  );
}

/** Uygulamanın herhangi bir yerinde: yayın sürüyorsa küçük bir şerit gösterir */
export function LiveIndicator() {
  const live = useLive();
  const [open, setOpen] = useState(false);
  const target = live.live?.active && live.live.kind && live.live.id ? { kind: live.live.kind, id: live.live.id } : null;
  const deck = useDeck(target);
  if (!live.canCast || !target) return null;
  return (
    <>
      <div className="live-indicator" role="status">
        <span className="live-dot" aria-hidden="true" />
        <span className="li-text">
          <small>TV'de yayında</small>
          <strong>{deck?.title ?? 'Sunum'}</strong>
        </span>
        <Btn size="sm" onClick={() => setOpen(true)}>
          Yönet
        </Btn>
        <Btn size="sm" variant="ghost" onClick={live.stop}>
          Bitir
        </Btn>
      </div>
      {open && <PresentOverlay target={target} startCasting={false} onClose={() => setOpen(false)} />}
    </>
  );
}
