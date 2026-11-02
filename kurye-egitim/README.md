# Kurye Sürüş Akademisi

Almanya'da van ile paket dağıtan şoförler için Türkçe, mobil öncelikli eğitim uygulaması. Hesap gerektirmez: bağlantıyı açan herkes kendi telefonunda bağımsız olarak kullanır, ilerleme o cihazın tarayıcısında (`localStorage`) saklanır.

## Bölümler
- **Bugün**: sıradaki ders, ilerleme, art arda kullanım günleri, tekrar ve hızlı test.
- **Dersler**: 6 konu, 20 ders; her ders sonunda test. Şıklar her seferinde karıştırılır.
  - Durma ve park · Trafik kuralları · Yasal zorunluluklar · Güvenli ve verimli sürüş · Araç bakımı ve arıza · Sağlık ve teslimat pratiği
- **Tekrar**: yanlış yapılan sorular; iki kez doğru bilinen soru listeden çıkar.
- **Kontrol**: vardiya öncesi araç kontrol listesi (her gün sıfırlanır).
- **Sözlük**: derslerdeki Almanca terimlerin aranabilir listesi.

## İçerik ekleme
Dersler `src/content/*.ts` dosyalarındadır. Blok türleri `src/types.ts` içinde: `p`, `h`, `list`, `steps`, `tip`, `warn`, `law`, `fine`, `terms`, `signs`, `table`. Trafik işaretleri `src/signs.tsx` içinde SVG olarak çizilir. Sözlük, derslerdeki `terms` bloklarından otomatik oluşur.

İçeriğin gözden geçirildiği tarih `src/content/index.ts` → `CONTENT_REVIEWED`. Ceza tutarları ve kurallar değiştiğinde güncellenmelidir.

## Komutlar
```bash
npm install
npm run dev      # geliştirme sunucusu
npm run build    # dist/index.html (tek dosya) + dist/artifact.html (Artifact yayını için)
```
