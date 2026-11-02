# Kurye Sürüş Akademisi

Almanya'da van ile paket dağıtan şoförler için Türkçe, mobil öncelikli eğitim uygulaması. Hesap gerektirmez: bağlantıyı açan herkes kendi telefonunda bağımsız olarak kullanır, ilerleme o cihazın tarayıcısında (`localStorage`) saklanır.

## Bölümler
- **Bugün**: sıradaki ders, ilerleme, art arda kullanım günleri, tekrar ve hızlı test.
- **Dersler**: 6 konu, 21 ders; her ders sonunda test. Şıklar her seferinde karıştırılır.
  - Durma ve park · Trafik kuralları · Yasal zorunluluklar · Güvenli ve verimli sürüş · Araç bakımı ve arıza · Sağlık ve teslimat pratiği
- **İşaretler**: 35 trafik işareti ve ek tabela, 6 grupta (tehlike, öncelik, yasak, zorunlu yön, bilgi, ek tabelalar); dokununca açıklama açılır. **İşaret testi** her seferinde 12 soru üretir: işareti görüp anlamını seçme veya anlamı okuyup doğru işareti bulma.
- **Senaryolar**: yukarıdan bakış çizilmiş 5 sokak durumu (durma ve park). Şoför sahnede A–D ile işaretli yerlerden birine dokunur; ardından her seçeneğin neden doğru ya da yanlış olduğu ve ilgili kural gösterilir. Sahneler `src/content/senaryolar.ts` içinde basit öğelerle (yol, kaldırım, ev, araç, işaret, ölçü) tanımlanır, `src/scene.tsx` çizer.
- **Tekrar**: yanlış yapılan sorular; iki kez doğru bilinen soru listeden çıkar.
- **Kontrol**: vardiya öncesi araç kontrol listesi (her gün sıfırlanır).
- **Sözlük**: derslerdeki Almanca terimlerin aranabilir listesi.

## İçerik ekleme
Dersler `src/content/*.ts` dosyalarındadır. Blok türleri `src/types.ts` içinde: `p`, `h`, `list`, `steps`, `tip`, `warn`, `law`, `fine`, `terms`, `signs`, `table`. Trafik işaretleri `src/signs.tsx` içinde SVG olarak çizilir; her işaretin Almanca adı, Türkçe anlamı, açıklaması ve grubu aynı dosyadaki listededir. Listeye eklenen işaret katalogda ve işaret testinde kendiliğinden yer alır (`src/signquiz.ts`). Sözlük, derslerdeki `terms` bloklarından otomatik oluşur.

İçeriğin gözden geçirildiği tarih `src/content/index.ts` → `CONTENT_REVIEWED`. Ceza tutarları ve kurallar değiştiğinde güncellenmelidir.

## Komutlar
```bash
npm install
npm run dev      # geliştirme sunucusu
npm run build    # dist/index.html (tek dosya) + dist/artifact.html (Artifact yayını için)
```
