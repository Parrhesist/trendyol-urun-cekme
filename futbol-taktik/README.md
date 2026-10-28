# Saha Kenarı — antrenör taktik ve maç programı

Tablet öncelikli (ekrana yansıtılabilir), bilgisayarda da çalışan tek takım için taktik, antrenman ve maç değerlendirme uygulaması.

## Modüller
- **Panel**: sıradaki maç, sezon formu, yük durumu, kadro uygunluğu, son taktikler.
- **Taktik tahtası**: FIFA ölçülerinde (105×68 m) saha, sürükle-bırak oyuncu/rakip/top/huni/kale, koşu–pas–top sürme okları, bölge ve hat çizimi, çok adımlı animasyon, sunum (tam ekran) modu, bağlantı ile paylaşım.
- **Antrenman**: haftalık takvim, drill kütüphanesi (saha diyagramlı), seans akışı, katılım, sRPE yükü ve akut:kronik yük oranı.
- **Maçlar**: maç öncesi (ilk 11, yedekler, rakip analizi, oyun planı, oyuncu görevleri, soyunma odası sunumu), devre arası (hızlı değerlendirme, değişiklikler, ikinci yarı mesajı), maç sonrası (sahaya dokunarak olay girişi, şut ve ısı haritası, istatistik karşılaştırma, oyuncu puanları, antrenmana aktarılan odaklar), CSV ile veri aktarımı.
- **Kadro**: oyuncu durumu (hazır/şüpheli/sakat/cezalı), sezon istatistikleri, CSV ile aktarım.

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
