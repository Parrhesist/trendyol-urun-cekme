# Saha Kenarı — paylaşımlı hosting kurulumu

Bu paket cPanel, Plesk, DirectAdmin gibi paylaşımlı hostinglerde **PHP ile** çalışır. Node.js, veritabanı
ya da komut satırı gerekmez; uygulama alan adınızın kökünde (`https://alanadiniz.com/`) açılır.

## Kurulum (5 dakika)

1. Hosting panelinizde **Dosya Yöneticisi**'ni açın ve `public_html` klasörüne girin.
   (Alt alan adı ya da alt klasör için o klasöre girin, ör. `public_html/saha`.)
2. Başka bir siteniz bu klasörde çalışıyorsa uygulamayı bir alt klasöre kurun (paket `index.php`, `index.html`
   ve `.htaccess` dosyalarını değiştirir). Hostingin koyduğu hoş geldiniz sayfası (`default.html` vb.) varsa silin.
3. `saha-kenari-hosting.zip` dosyasını bu klasöre **yükleyin**, sağ tıklayıp **Ayıkla / Extract** deyin.
4. Tarayıcıda alan adınızı açın. İlk açılışta **antrenör şifresi belirlemeniz** istenir: şifreyi girin;
   bu cihazda giriş yapmış kalırsınız. Sonra **Örnek takımla başla** ya da **Boş başla** deyin.

Bu kadar. Oyuncular aynı adresi şifresiz açıp yalnızca görüntüler; başka bir cihazda düzenlemek için
**Antrenör girişi** ile aynı şifre girilir.

> Gizli dosyalar: zip içinde `.htaccess` dosyaları vardır. Dosya yöneticiniz noktayla başlayan dosyaları
> gizliyorsa ayarlardan **Gizli dosyaları göster**'i açın; silinmemeleri gerekir.

## TV'ye yansıtma

TV'nin tarayıcısında `https://alanadiniz.com/#ekran` adresini açın (şifre gerekmez) ya da uygulamada
**Bu cihazı TV ekranı yap** deyin. Tablette sunumu açıp **Ekrana yansıt → TV'ye gönder** deyin; slaytlar,
taktik adımları ve süre tabletle birlikte ilerler. Paylaşımlı hostingde değişiklikler sunum sırasında her
saniye, diğer zamanlarda birkaç saniyede bir alınır.

## Tarayıcı çerçevesi olmadan (tam ekran)

- **iPad / iPhone (Safari):** Paylaş → **Ana Ekrana Ekle**; simgeden açınca adres çubuğu olmaz.
- **Android (Chrome):** ⋮ → **Ana ekrana ekle** / **Uygulamayı yükle**.
- Bu özellik için sitenin **HTTPS** ile açılması gerekir (panelde ücretsiz SSL / AutoSSL / Let's Encrypt).

## Şifre işlemleri

- **Şifreyi unuttum / değiştirmek istiyorum:** dosya yöneticisinde `ayarlar-ornek.php` dosyasını `ayarlar.php`
  adıyla kopyalayın, içinde `$ANTRENOR_SIFRESI = 'yeni-sifre';` yazın. Buraya yazılan şifre, uygulamada
  belirlenen şifrenin yerine geçer.
  Ya da `veri/sifre.php` dosyasını silip uygulamada yeniden belirleyin (şifre yokken ilk giren kişiye sorulur,
  bu yüzden hemen belirleyin).
- **Bir cihazda oturumu kapatmak:** uygulamada **Ayarlar → Antrenör oturumu → Bu cihazda oturumu kapat**.
- 10 hatalı denemeden sonra o adres 10 dakika bekletilir.
- **Siteyi tamamen kapatmak** (oyuncular da şifreyle girsin): panelde **Dizin Gizliliği / Directory Privacy /
  Parola Korumalı Dizinler** ile klasöre şifre koyun.

## Veriler ve yedek

- Tüm veriler `veri/veri.php` dosyasındadır (tarayıcıdan açılamaz). Bu dosyayı indirmek yedek almaktır.
- Uygulamada **Ayarlar → Yedekleme** ile tüm veriyi metin olarak kopyalayıp başka kuruluma yükleyebilirsiniz.
  claude.ai'deki sürümdeki verileri taşımak için orada **Yedeği kopyala**, burada **Yedekten geri yükle**.
- Güncelleme: yeni paketi aynı klasöre ayıklayın; `veri/` klasöründeki veriler ve `ayarlar.php` korunur
  (paket bunların üzerine yazmaz).

## Sorun giderme

- **Hostingin varsayılan sayfası açılıyor:** klasörde `default.html`, `index.htm` gibi eski bir giriş sayfası kalmış; silin.
- **"Takım verilerine bağlanılamadı":** tarayıcıda `alanadiniz.com/api.php?islem=saglik` adresini açın.
  `{"ok":true,...}` görmelisiniz. PHP hatası görüyorsanız panelden PHP sürümünü **7.4 ya da üstü** yapın.
- **"veri klasörü yazılamıyor":** dosya yöneticisinde `veri` klasörünün izinlerini **755**, olmazsa **775**, o da olmazsa **777** yapın.
- **500 Internal Server Error:** kökteki `.htaccess` dosyasını silip deneyin; uygulama onsuz da çalışır (bazı hostinglerde bazı satırlara izin verilmez).
- **Değişiklikler diğer cihaza geç geliyor:** sunum sırasında en çok ~1 saniye, diğer zamanlarda ~2,5 saniye
  gecikme normaldir. Daha hızlı ve anlık sürüm için Node.js destekli sunucu paketi (`saha-kenari-sunucu.zip`) kullanılabilir.
