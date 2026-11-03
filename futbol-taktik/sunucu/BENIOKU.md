# Saha Kenarı — kendi sunucunuzda kurulum

Taktik tahtası, antrenman planı ve maç değerlendirme uygulaması. Bu paket uygulamayı ve küçük bir takım
sunucusunu içerir: veriler sunucuda saklanır, antrenörün tableti, TV ve oyuncuların telefonları aynı veriyi
anında görür, sunumlar TV'ye gönderilir.

Ek paket kurmanız gerekmez; yalnızca **Node.js 18 veya üstü** gerekir.

## Hızlı başlangıç

```bash
unzip saha-kenari-sunucu.zip
cd saha-kenari
ANTRENOR_SIFRESI='guclu-bir-sifre' node server.js
```

Tarayıcıda `http://SUNUCU_ADRESI:8080` adresini açın. Sağ üstteki **Antrenör girişi** ile şifreyi girin,
ardından **Örnek takımla başla** ya da **Boş başla** deyin.

Windows sunucuda (PowerShell):

```powershell
$env:ANTRENOR_SIFRESI = "guclu-bir-sifre"; node server.js
```

## Ayarlar (ortam değişkenleri)

| Değişken | Varsayılan | Açıklama |
|---|---|---|
| `ANTRENOR_SIFRESI` | (yok) | Düzenleme şifresi. **Mutlaka verin**: verilmezse adresi bilen herkes verileri değiştirebilir. Şifresiz girenler (oyuncular, TV) yalnızca görüntüler. |
| `IZLEME_SIFRESI` | (yok) | Verilirse site tamamen kapanır; açılışta tarayıcı kullanıcı adı/şifre sorar (kullanıcı adı önemsiz, şifre bu ya da antrenör şifresi). |
| `PORT` | `8080` | Dinlenecek port. |
| `HOST` | `0.0.0.0` | Dinlenecek adres (`127.0.0.1` verilirse yalnızca aynı makinedeki nginx erişir). |
| `VERI_KLASORU` | `./data` | Verilerin tutulduğu klasör. |

## Sürekli çalıştırma

**systemd (Ubuntu/Debian):**

```bash
sudo mkdir -p /opt/saha-kenari && sudo cp -r . /opt/saha-kenari
sudo chown -R www-data:www-data /opt/saha-kenari
sudo nano /opt/saha-kenari/saha-kenari.service    # şifreyi değiştirin
sudo cp /opt/saha-kenari/saha-kenari.service /etc/systemd/system/
sudo systemctl enable --now saha-kenari
sudo systemctl status saha-kenari
```

**Docker:**

```bash
nano docker-compose.yml    # ANTRENOR_SIFRESI'ni değiştirin
docker compose up -d
```

**pm2:** `ANTRENOR_SIFRESI='...' pm2 start server.js --name saha-kenari && pm2 save`

## Alan adı ve HTTPS (önerilir)

Şifre her düzenlemede sunucuya gönderilir; internete açık sunucuda **HTTPS kullanın**. `nginx-ornek.conf`
dosyasındaki ayarları nginx'e ekleyin (canlı güncellemeler için `proxy_buffering off` gereklidir), sonra
`sudo certbot --nginx -d alanadiniz.com` ile ücretsiz sertifika alın. Bu durumda sunucuyu `HOST=127.0.0.1`
ile başlatıp dışarıya yalnızca nginx'i açabilirsiniz.

Uygulama bir alt klasörde de çalışır (`https://alanadi.com/saha/`); adresin sonunda `/` olmalıdır.

## Tarayıcı çerçevesi olmadan (tam ekran uygulama)

- **iPad / iPhone (Safari):** Paylaş → **Ana Ekrana Ekle**. Ana ekrandaki simgeden açıldığında adres çubuğu olmaz.
- **Android (Chrome):** ⋮ → **Ana ekrana ekle** / **Uygulamayı yükle**. Tam ekran açılır.
- **Bilgisayar (Chrome/Edge):** adres çubuğundaki **Yükle** simgesi; ya da F11.

## TV'ye yansıtma

TV'nin tarayıcısında `http://SUNUCU_ADRESI:8080/#ekran` adresini açın (şifre gerekmez) ya da uygulamada
**Bu cihazı TV ekranı yap** deyin. Tablette bir sunum açıp **Ekrana yansıt → TV'ye gönder** dediğinizde TV
listede görünür; slaytlar, taktik adımları ve süre tabletle birlikte ilerler.

## Veriler ve yedek

- Tüm veriler `data/veri.json` dosyasındadır; bu dosyayı kopyalamak yedek almak demektir.
- Sunucu her açılışta önceki kaydı `data/veri.yedek.json` olarak saklar.
- Uygulamada **Ayarlar → Yedekleme** ile tüm veriyi metin olarak kopyalayıp başka bir kuruluma yükleyebilirsiniz.
  claude.ai'deki sürümde girdiğiniz verileri taşımak için orada **Yedeği kopyala**, burada **Yedekten geri yükle**.

## Sunucusuz kullanım

Yalnızca statik dosya barındırmanız (Node.js yok) varsa `statik/` klasörünün içeriğini yükleyin. Uygulama
tamamen çalışır ama veriler her cihazın kendi tarayıcısında kalır; cihazlar arası eşitleme ve TV'ye
gönderme olmaz (aynı bilgisayara HDMI ile bağlı TV hariç).

## Sorun giderme

- **"Takım verilerine bağlanılamadı"**: sunucu kapalı ya da adres yanlış. `curl http://SUNUCU:8080/api/saglik` `ok` dönmeli.
- **TV canlı güncellenmiyor**: nginx kullanıyorsanız `proxy_buffering off` ve `proxy_read_timeout 1h` satırlarını ekleyin.
- **Şifre kabul edilmiyor**: ortam değişkenini değiştirdikten sonra sunucuyu yeniden başlatın. 10 hatalı denemeden sonra o adres 10 dakika bekletilir.
- **Port kullanımda**: `PORT=8090 node server.js`.
