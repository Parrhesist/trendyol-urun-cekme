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
  const castBar = live.canCast ? (
    casting ? (
      <div className="cast-bar on">
        <span className="live-dot" aria-hidden="true" />
        <span>
          TV'de yayında
          {live.screens != null && <small> · {live.screens ? `${live.screens} ekran bağlı` : 'bağlı ekran görünmüyor'}</small>}
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

/** Ekrana yansıtmanın üç yolu: bağlı TV, bu cihazı yansıtma, doğrudan bağlantı */
export function CastModal({ target, onClose, onStart }: { target: DeckTarget; onClose: () => void; onStart: (cast: boolean) => void }) {
  const { data, mode } = useStore();
  const deck = useDeck(target);
  const live = useLive();
  const hasBase = !!appBase(data.settings);
  const screenLink = linkFor(data.settings, SCREEN_HASH);
  const deckLink = linkFor(data.settings, deckHash(target));
  return (
    <Modal title="Ekrana yansıt" onClose={onClose} wide>
      <p className="muted">
        <strong>{deck?.title}</strong> · {deck?.slides.length} slayt
      </p>
      <div className="cast-options">
        {live.canCast && (
          <section className="cast-card primary">
            <h3>
              <Icon name="cast" /> Bağlı TV'ye gönder
            </h3>
            <p>
              Sunumu siz tabletten yönetirsiniz; TV slaytı, taktik adımını ve süreyi aynı anda gösterir.{' '}
              {live.screens != null && (
                <strong className={live.screens ? 'tone-good' : 'tone-warn'}>{live.screens ? `${live.screens} ekran bağlı.` : 'Şu an bağlı ekran görünmüyor.'}</strong>
              )}
            </p>
            <Btn variant="primary" size="lg" icon="cast" onClick={() => onStart(true)}>
              TV'ye gönder ve sunumu başlat
            </Btn>
            <details open={!live.screens}>
              <summary>TV'yi nasıl bağlarım?</summary>
              <ol className="steps">
                {mode === 'shared' ? (
                  <>
                    <li>TV'nin internet tarayıcısında bu adresi bir kez açın ve yer imlerine ekleyin:</li>
                    <LinkBox link={screenLink} id="cast-screen-link" />
                    <li>TV tarayıcısında claude.ai'ye, uygulamayı açabilen bir hesapla giriş yapılmış olmalı (ör. sizin hesabınız). Giriş bir kez yapılır.</li>
                    <li>TV'de bekleme ekranı açılır. Buradan "TV'ye gönder" dediğiniz sunum otomatik gelir.</li>
                  </>
                ) : (
                  <>
                    <li>Bu bilgisayarı TV'ye HDMI ile bağlayın (genişletilmiş ekran).</li>
                    <li>Yeni bir tarayıcı penceresinde şu adresi açıp pencereyi TV ekranına taşıyın:</li>
                    <LinkBox link={screenLink} id="cast-screen-link" />
                    <li>Buradan gönderdiğiniz sunum o pencerede görünür, siz bu ekrandan yönetirsiniz.</li>
                  </>
                )}
              </ol>
            </details>
          </section>
        )}
        <section className="cast-card">
          <h3>
            <Icon name="present" /> Bu cihazı yansıt
          </h3>
          <p>HDMI kablosu, AirPlay (iPad → Apple TV veya AirPlay destekli TV) ya da Chromecast/ekran yansıtma kullanıyorsanız. TV'de giriş gerekmez.</p>
          <Btn
            size="lg"
            onClick={() => {
              toggleFullscreen();
              onStart(false);
            }}
          >
            Tam ekran başlat
          </Btn>
        </section>
        <section className="cast-card">
          <h3>
            <Icon name="share" /> Doğrudan bağlantı
          </h3>
          <p>Akıllı TV tarayıcısında, Chromecast'e yayınlanan Chrome sekmesinde veya oyuncuların telefonunda bu sunumu doğrudan, tam ekran açar.</p>
          <div className="cast-link">
            <LinkBox link={deckLink} id="cast-deck-link" />
            {hasBase && <QR text={deckLink} size={132} label="Sunum bağlantısı QR kodu" />}
          </div>
          {!hasBase && <p className="hint">Tam adres oluşturmak için Ayarlar → TV ve ekranlar bölümüne uygulamanın bağlantısını girin.</p>}
          {mode === 'shared' && <p className="hint">Bağlantıyı açan kişinin uygulamaya erişimi olmalı (Paylaş menüsünden verilir).</p>}
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
