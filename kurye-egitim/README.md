# Kurye Sürüş Akademisi

Almanya'da van veya otomobil (PKW) ile paket dağıtan şoförler için Türkçe, mobil öncelikli eğitim uygulaması. Hesap gerektirmez: bağlantıyı açan herkes kendi telefonunda bağımsız olarak kullanır, ilerleme o cihazın tarayıcısında (`localStorage`) saklanır.

## Araç seçimi
İlk açılışta kullanıcı van veya otomobil seçer (sonra Ayarlar'dan değiştirilebilir). Ortak içerik her iki araç için yazılmıştır; sadece bir araca özgü ders, blok, soru, senaryo ve kontrol maddeleri `only: 'van'` veya `only: 'pkw'` ile işaretlenir ve `src/content/index.ts` → `applyVehicle()` bunları süzer. Otomobile özel: “Kendi aracınla çalışmak” dersi (muayene, sigorta), otomobilde yük yerleştirme, ilgili soru ve senaryo. Van'a özel: yükseklik sınırı senaryosu, van yükleme kuralları.

## Bölümler
- **Bugün**: sıradaki ders, ilerleme, art arda kullanım günleri, tekrar ve hızlı test.
- **Dersler**: 6 konu, 21 ders; her ders sonunda test. Şıklar her seferinde karıştırılır.
  - Durma ve park · Trafik kuralları · Yasal zorunluluklar · Güvenli ve verimli sürüş · Araç bakımı ve arıza · Sağlık ve teslimat pratiği
- **İşaretler**: 35 trafik işareti ve ek tabela, 6 grupta (tehlike, öncelik, yasak, zorunlu yön, bilgi, ek tabelalar); dokununca açıklama açılır. **İşaret testi** her seferinde 12 soru üretir: işareti görüp anlamını seçme veya anlamı okuyup doğru işareti bulma.
- **Senaryolar**: çizimli durumlar: durma ve park (5), trafik (4: tabelasız kavşak, ana yol, sağa dönüş, bisikletli sollama), yasal (kaza sonrası adımları sıraya koyma), sürüş (van: yükseklik sınırı; otomobil: ağır paketin yeri), arıza (otobanda bekleme yeri, üçgen reflektör), sağlık (bahçede köpek). Şoför sahnede harfle işaretli seçeneklerden birine (durma yeri, araç veya kişi) dokunur; ardından her seçeneğin neden doğru ya da yanlış olduğu ve ilgili kural gösterilir. Sahneler `src/content/senaryolar.ts` içinde basit öğelerle (yol, kaldırım, ev, araç, işaret, ölçü) tanımlanır, `src/scene.tsx` çizer.
- **Tekrar**: yanlış yapılan sorular; iki kez doğru bilinen soru listeden çıkar.
- **Kontrol**: vardiya öncesi araç kontrol listesi (her gün sıfırlanır).
- **Sözlük**: derslerdeki Almanca terimlerin aranabilir listesi.

## İçerik ekleme
Dersler `src/content/*.ts` dosyalarındadır. Blok türleri `src/types.ts` içinde: `p`, `h`, `list`, `steps`, `tip`, `warn`, `law`, `fine`, `terms`, `signs`, `table`. Trafik işaretleri `src/signs.tsx` içinde SVG olarak çizilir; her işaretin Almanca adı, Türkçe anlamı, açıklaması ve grubu aynı dosyadaki listededir. Listeye eklenen işaret katalogda ve işaret testinde kendiliğinden yer alır (`src/signquiz.ts`). Sözlük, derslerdeki `terms` bloklarından otomatik oluşur.

İçeriğin gözden geçirildiği tarih `src/content/index.ts` → `CONTENT_REVIEWED`. Ceza tutarları ve kurallar değiştiğinde güncellenmelidir.

## Telefona kurma ve internetsiz kullanım (PWA)
`public/` içindeki manifest, simgeler ve `sw.js` sayesinde uygulama kendi adresinde (HTTPS) yayınlandığında ana ekrana eklenebilir ve internetsiz açılır. claude.ai Artifact sürümünde service worker'a izin verilmez; orada uygulama normal web sayfası gibi çalışır.

GitHub Pages ile yayın: `.github/workflows/kurye-egitim-pages.yml`, `main` dalına `kurye-egitim/` altında değişiklik geldiğinde (veya elle çalıştırıldığında) derleyip yayınlar. Bir kez depo ayarlarından **Settings → Pages → Source: GitHub Actions** seçilmelidir. Adres: `https://<kullanıcı>.github.io/<depo>/`.

## Paylaşımlı sunucuya kurulum
`npm run paket` → `paket/kurye-egitim.zip`. İçindeki dosyalar herhangi bir web sunucusuna (ör. Apache'li paylaşımlı hosting) kopyalanır; veritabanı veya PHP gerekmez. Ayrıntılar zip içindeki `KURULUM.txt` dosyasında (kaynağı `deploy/`).

## Komutlar
```bash
npm install
npm run dev      # geliştirme sunucusu
npm run build    # dist/index.html (tek dosya) + dist/artifact.html (Artifact yayını için)
```
