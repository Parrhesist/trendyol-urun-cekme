# Saha Kenarı — antrenör taktik ve maç programı

Tablet öncelikli (ekrana yansıtılabilir), bilgisayarda da çalışan tek takım için taktik, antrenman ve maç değerlendirme uygulaması.

## Modüller
- **Panel**: sıradaki maç, sezon formu, yük durumu, kadro uygunluğu, son taktikler.
- **Taktik tahtası**: oyuncu etiketi seçilebilir (no / konuma göre mevki / soyad / ikisi); FIFA ölçülerinde (105×68 m) saha, sürükle-bırak oyuncu/rakip/top/huni/kale, koşu–pas–top sürme okları, bölge ve hat çizimi, çok adımlı animasyon, sunum (tam ekran) modu, bağlantı ile paylaşım.
- **Antrenman**: haftalık takvim, drill kütüphanesi (saha diyagramlı), seans akışı, katılım, sRPE yükü ve akut:kronik yük oranı.
- **Maçlar**: maç öncesi
  - *Kadro ve diziliş*: oyuncular sahada serbestçe sürüklenir, üst üste bırakılınca yer değiştirir, kadro listesinden sürükle-bırak veya dokun-yerleştir; mevki her oyuncunun konumundan otomatik yazılır (doğal mevkisi dışındaysa turuncu), sahadaki diziliş hatlardan okunur (ör. 4-2-3-1). Şablona geçişte oyuncular korunur ve en uygun yerlere eşleştirilir (Macar algoritması: mesafe + doğal mevki). Kaptan, yedekler, oyuncu görevleri, geri al, son maçın kadrosunu kopyalama.
  - *Takım talimatları*: savunma bloğu, savunma hattı, pres, geçişler, oyun kurma, pas stili, tempo, genişlik, hücum yönü, ofsayt taktiği; hazır stiller; sahada pres alanı, savunma hattı ve takım boyu (m) gösterimi; penaltı/korner/serbest vuruş görevlileri.
  - *Maç taktikleri*: maç kadrosuyla yeni taktik çizme, kütüphanedeki taktiği bu kadroya uyarlama, sunum sırası.
  - *Rakip ve oyun planı*, soyunma odası sunumu; devre arası (hızlı değerlendirme, değişiklikler, ikinci yarı mesajı), maç sonrası (sahaya dokunarak olay girişi, şut ve ısı haritası, istatistik karşılaştırma, oyuncu puanları, antrenmana aktarılan odaklar), CSV ile veri aktarımı.
- **Kadro**: oyuncu durumu (hazır/şüpheli/sakat/cezalı), sezon istatistikleri, CSV ile aktarım.

## Hazır taktik kütüphanesi
`src/library/` altında 60 animasyonlu taktik (Taktik → Hazır taktikler, `#kutuphane`):
- **Sistemler (14):** 4-4-2 bölge savunması (Sacchi), elmas, 4-3-3/2-3-5, 4-2-3-1, 3-5-2, 3-4-3, 4-1-4-1, 4-2-2-2, 4-3-2-1, 3-4-2-1, 2-3-5 Piramit, WM, Catenaccio, Total futbol
- **Oyun kurma (7):** La Volpe çıkışı, kaleciyle +1, ters bek, 3-2 kutu, kısa kale vuruşu, uzun top ve ikinci top, üçüncü adamla çıkış
- **Hücum kalıpları (14):** bindirme, içeriden bindirme, ver-kaç, üçüncü adam, kanat değiştirme, beş koridor, sahte 9, ters kanat, geri pas, erken orta, arkaya koşu, hatlar arası, kanat rotasyonu, üçgenler
- **Pres ve savunma (10):** adam yönelimli pres, kenara yönlendirme, gölgeleme, pres tetikleyicileri, alçak blok, adam adama, ofsayt tuzağı, ceza sahası savunması, ikili sıkıştırma
- **Geçişler (5):** karşı pres, kontra atak, kaleciden uzun top, savunma geçişi, dinlenme savunması
- **Duran toplar (10):** korner hücum (3) ve savunma (2), serbest vuruş (3), taç atışı (2)

Her taktiğin anlatımı, adım notları, koçluk noktaları ve kaynağı vardır. Taktikler `src/library/dsl.ts` içindeki küçük bir yazım diliyle tanımlanır (oyuncu anahtarı = forma numarası, rakip `r` önekli; `run`, `pass`, `key`, `shot`, `zone`, `line`, `pair`). Kütüphane salt okunurdur: **Düzenle ve kaydet** kullanıcıya ait bir kopya oluşturur (`libId` ile kaynağa bağlı); anlatım, koçluk noktaları, kaynak, adımlar, çizimler, animasyon hızı ve oyuncu boyutu bu kopyada değiştirilir. Kütüphane taktikleri maça uyarlanabilir, sunulabilir ve TV'ye gönderilebilir (`#sunum-kutup-<id>`).

## TV ve ekranlara yansıtma
Her sunum ekranında (taktik, maç öncesi, devre arası, antrenman seansı, haftalık plan) **Sunum** ve **Ekrana yansıt** düğmeleri var:
- **Bağlı TV'ye gönder**: TV tarayıcısında bir kez `…#ekran` adresi açılır (bekleme ekranı: saat, sıradaki maç ve antrenman). Tabletten gönderilen sunum gelir; slayt, taktik adımı ve antrenman süresi tabletle eşzamanlı ilerler. Paylaşılan modda `live/screen` belgesi ve bağlı ekranları sayan oda varlığı (presence), yerel modda aynı cihazdaki pencereler arasında BroadcastChannel kullanılır (HDMI ile bağlı TV'deki ikinci pencere).
- **Bu cihazı yansıt**: AirPlay, Chromecast veya HDMI ile tam ekran sunum; TV'de giriş gerekmez.
- **Doğrudan bağlantı**: `…#sunum-<mac|devre|taktik|antrenman|hafta>-<id>` sunumu tek başına, tam ekran açar; QR kod ile telefona aktarılır.
- Kumanda/klavye: ← → slayt, ↑ ↓ taktik adımı, OK/Enter oynat veya süreyi başlat, F tam ekran. TV'de kontroller birkaç saniye sonra gizlenir, ekran uykuya geçmez (tarayıcı izin verirse).
- Bağlantılar `VITE_APP_URL` (bkz. `.env.production`) ya da Ayarlar → TV ve ekranlar → Uygulama bağlantısı ile oluşturulur.

## Altyapı
React 18 + TypeScript + Vite, tek HTML dosyasına derlenir (`vite-plugin-singlefile`). Grafikler ve saha SVG ile çizilir, harici kütüphane yoktur.

Veri katmanı (`src/store.tsx`):
- claude.ai Artifact olarak yayınlandığında paylaşılan veritabanı (`db`) kullanılır; antrenör yazar, paylaşılan oyuncular salt okunur görür.
- Başka bir yerde açıldığında veriler tarayıcının `localStorage`'ında tutulur.

## Komutlar
```bash
npm install
npm run dev      # geliştirme sunucusu
npm run build    # dist/index.html (tek dosya) + dist/artifact.html (Artifact yayını için)
```

## CSV biçimleri
- Olaylar: `dakika;takim;olay;forma_no;x;y` (x 0–105, y 0–68 metre; takım `biz`/`rakip`)
- Takım istatistikleri: `istatistik;biz;rakip` (`topa_sahip_olma`, `pas`, `isabetli_pas_yuzde`, `xg`, `kosu_km`)
- Kadro: `forma_no;ad_soyad;mevki;ayak`
