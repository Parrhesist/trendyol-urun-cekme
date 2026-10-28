import { useEffect, useRef, useState } from 'react';
import { useStore } from '../store';
import { Btn, copyText, Modal } from '../ui';

const framed = () => {
  try {
    return window.self !== window.top;
  } catch {
    return true;
  }
};

/** Taktik veya maç için doğrudan açılan bağlantı */
export function ShareModal({ kind, id, title, onClose }: { kind: 'taktik' | 'mac'; id: string; title: string; onClose: () => void }) {
  const { mode, toast } = useStore();
  const hash = `#${kind}-${id}`;
  const inArtifact = framed();
  const url = inArtifact ? hash : location.href.split('#')[0] + hash;
  const ref = useRef<HTMLElement>(null);
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    if (location.hash !== hash) location.hash = hash;
  }, [hash]);

  return (
    <Modal title="Bağlantı ile paylaş" onClose={onClose}>
      <p>
        <strong>{title}</strong> doğrudan açılacak şekilde paylaşılır. Oyuncular bağlantıyı açınca taktiği görür ve adımları oynatabilir, değiştiremez.
      </p>
      {inArtifact ? (
        <ol className="steps">
          <li>
            Sayfanın sağ üstündeki <strong>Share / Paylaş</strong> menüsünü açın ve erişimi oyuncularınıza verin (e-posta ile ya da bağlantıya sahip herkes).
          </li>
          <li>
            Aynı menüden <strong>Copy link / Bağlantıyı kopyala</strong> deyin. Bu ekran açıkken kopyalanan bağlantı sonuna <code>{hash}</code> eklenmiş olarak gelir ve doğrudan bu {kind === 'taktik' ? 'taktiği' : 'maçı'} açar.
          </li>
          <li>Bağlantıyı WhatsApp grubu veya e-posta ile oyunculara gönderin.</li>
        </ol>
      ) : null}
      <div className="share-box">
        <code ref={ref}>{url}</code>
        <Btn
          icon="copy"
          variant="primary"
          onClick={async () => {
            const ok = await copyText(inArtifact ? hash : url, ref.current);
            setCopied(ok);
            toast(ok ? 'Kopyalandı' : 'Metin seçildi, kopyalayabilirsiniz');
          }}
        >
          {copied ? 'Kopyalandı' : inArtifact ? 'Eki kopyala' : 'Bağlantıyı kopyala'}
        </Btn>
      </div>
      {mode === 'local' && <p className="hint">Not: Bu kopya verileri yalnızca bu cihazda tutuyor. Oyuncuların aynı veriyi görmesi için uygulamanın paylaşılan sürümünü kullanın.</p>}
    </Modal>
  );
}
