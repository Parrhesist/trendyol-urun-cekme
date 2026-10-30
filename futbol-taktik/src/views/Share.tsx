import { QR } from '../components/QR';
import { LinkBox } from '../present/Actions';
import { appBase, linkFor } from '../present/links';
import { useStore } from '../store';
import { Modal } from '../ui';

/** Taktik veya maç için doğrudan açılan bağlantı */
export function ShareModal({ kind, id, title, onClose }: { kind: 'taktik' | 'mac'; id: string; title: string; onClose: () => void }) {
  const { data, mode } = useStore();
  const link = linkFor(data.settings, `${kind}-${id}`);
  const hasBase = !!appBase(data.settings);
  return (
    <Modal title="Bağlantı ile paylaş" onClose={onClose}>
      <p>
        <strong>{title}</strong> bu bağlantıyla doğrudan açılır. Oyuncular görür ve adımları oynatabilir, değiştiremez.
      </p>
      <div className="cast-link">
        <LinkBox link={link} id="share-link" />
        {hasBase && <QR text={link} size={132} label="Paylaşım bağlantısı QR kodu" />}
      </div>
      {mode === 'shared' && (
        <p className="hint">
          Oyuncuların açabilmesi için sayfanın sağ üstündeki <strong>Share / Paylaş</strong> menüsünden onlara erişim verin.
        </p>
      )}
      {mode === 'local' && <p className="hint">Bu kopya verileri yalnızca bu cihazda tutuyor. Oyuncuların aynı veriyi görmesi için uygulamanın paylaşılan sürümünü kullanın.</p>}
      {!hasBase && <p className="hint">Tam adres için Ayarlar → TV ve ekranlar bölümüne uygulamanın bağlantısını girin.</p>}
    </Modal>
  );
}
