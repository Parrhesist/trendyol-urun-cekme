<?php
// Saha Kenarı — paylaşımlı hosting için takım sunucusu (PHP 7.2 ve üstü, veritabanı gerekmez).
// Veriler veri/veri.php dosyasında JSON olarak durur; uygulama birkaç saniyede bir değişiklikleri sorar.
// Her belge geldiği JSON metniyle saklanır: PHP'nin {} → [] dönüşümü uygulama verisini bozmaz.

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store, no-cache, must-revalidate');
header('X-Content-Type-Options: nosniff');

$ANTRENOR_SIFRESI = '';
if (is_file(__DIR__ . '/ayarlar.php')) include __DIR__ . '/ayarlar.php';

define('KLASOR', __DIR__ . '/veri');
define('VERI', KLASOR . '/veri.php');
define('SURUM', KLASOR . '/surum.php');
define('SIFRE', KLASOR . '/sifre.php');
define('DENEME', KLASOR . '/deneme.php');
define('KILIT', KLASOR . '/kilit.php');
// veri dosyaları doğrudan açılırsa içerik gösterilmez
define('KORUMA', "<?php http_response_code(404); exit; ?>\n");
define('EN_BUYUK', 2 * 1024 * 1024);
define('SILINEN_OMRU', 7 * 24 * 3600);

$KOLEKSIYONLAR = array('players', 'tactics', 'drills', 'sessions', 'matches', 'settings', 'live', 'screens');
$SIFRESIZ = array('screens'); // TV nabzı

function cevap($kod, $veri = null)
{
    http_response_code($kod);
    if ($veri !== null) echo json_encode($veri, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function oku($yol, $bos)
{
    if (!is_file($yol)) return $bos;
    $s = (string) @file_get_contents($yol);
    $i = strpos($s, "\n");
    $j = json_decode($i === false ? '' : substr($s, $i + 1), true);
    return is_array($j) ? $j : $bos;
}

function yaz($yol, $veri)
{
    $gecici = $yol . '.' . bin2hex(random_bytes(4)) . '.tmp';
    if (@file_put_contents($gecici, KORUMA . json_encode($veri, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES)) === false) {
        cevap(500, array('hata' => 'Veri yazılamadı: "veri" klasörünün yazma izni yok (dosya yöneticisinden 755, olmazsa 775 ya da 777 yapın).'));
    }
    if (!@rename($gecici, $yol)) {
        @unlink($yol);
        @rename($gecici, $yol);
    }
}

function kilitle()
{
    $k = @fopen(KILIT, 'c');
    if (!$k) cevap(500, array('hata' => 'Veri klasörü yazılamıyor (izinleri 755, olmazsa 775 ya da 777 yapın).'));
    flock($k, LOCK_EX);
    return $k;
}

function istemci_ip()
{
    return isset($_SERVER['REMOTE_ADDR']) ? $_SERVER['REMOTE_ADDR'] : '';
}

function korumali()
{
    global $ANTRENOR_SIFRESI;
    return $ANTRENOR_SIFRESI !== '' || is_file(SIFRE);
}

/** Hatalı şifre denemeleri: 10 denemeden sonra 10 dakika bekletilir */
function engelli()
{
    $d = oku(DENEME, array());
    $ip = istemci_ip();
    return isset($d[$ip]) && $d[$ip]['kadar'] > time();
}
function hatali_deneme()
{
    $k = kilitle();
    $d = oku(DENEME, array());
    $ip = istemci_ip();
    $simdi = time();
    foreach ($d as $a => $x) if ($x['kadar'] < $simdi && $x['son'] < $simdi - 600) unset($d[$a]);
    $x = isset($d[$ip]) ? $d[$ip] : array('n' => 0, 'kadar' => 0, 'son' => 0);
    $x['n'] = ($x['son'] > $simdi - 600) ? $x['n'] + 1 : 1;
    $x['son'] = $simdi;
    if ($x['n'] >= 10) {
        $x['kadar'] = $simdi + 600;
        $x['n'] = 0;
    }
    $d[$ip] = $x;
    yaz(DENEME, $d);
    flock($k, LOCK_UN);
    fclose($k);
    sleep(1);
}

function sifre_dogru($verilen)
{
    global $ANTRENOR_SIFRESI;
    if (!korumali()) return true;
    if (!is_string($verilen) || $verilen === '') return false;
    if ($ANTRENOR_SIFRESI !== '') return hash_equals(hash('sha256', $ANTRENOR_SIFRESI), hash('sha256', $verilen));
    $s = oku(SIFRE, array());
    return isset($s['ozet']) && password_verify($verilen, $s['ozet']);
}

/* ---------------- başlangıç denetimleri ---------------- */

if (!is_dir(KLASOR)) @mkdir(KLASOR, 0755, true);
if (!is_dir(KLASOR) || !is_writable(KLASOR)) {
    cevap(500, array('hata' => 'Uygulamanın yanındaki "veri" klasörü yazılamıyor. Dosya yöneticisinde izinlerini 755, olmazsa 775 ya da 777 yapın.'));
}

$islem = isset($_GET['islem']) ? $_GET['islem'] : '';
$yontem = isset($_SERVER['REQUEST_METHOD']) ? $_SERVER['REQUEST_METHOD'] : 'GET';

if ($islem === 'saglik') cevap(200, array('ok' => true, 'php' => PHP_VERSION));

/* ---------------- okuma: değişiklikleri sor ---------------- */

if ($islem === 'degisiklik' && $yontem === 'GET') {
    $istenen = isset($_GET['surum']) ? (int) $_GET['surum'] : 0;
    $s = oku(SURUM, array('surum' => 0));
    // değişiklik yoksa büyük dosya hiç okunmaz
    if ($istenen > 0 && $istenen === (int) $s['surum']) cevap(200, array('surum' => $istenen, 'belgeler' => new stdClass()));
    $v = oku(VERI, array('surum' => 0, 'budama' => 0, 'belgeler' => array()));
    $tam = $istenen <= 0 || $istenen < (int) $v['budama'] || $istenen > (int) $v['surum'];
    $parca = array();
    foreach ($v['belgeler'] as $yol => $b) {
        if ($tam ? $b['j'] !== null : $b['v'] > $istenen) $parca[] = json_encode((string) $yol) . ':' . ($b['j'] === null ? 'null' : $b['j']);
    }
    http_response_code(200);
    echo '{"surum":' . (int) $v['surum'] . ',"tam":' . ($tam ? 'true' : 'false') . ',"belgeler":{' . implode(',', $parca) . '}}';
    exit;
}

/* ---------------- yazma işlemleri (POST, JSON gövde) ---------------- */

if ($yontem !== 'POST') cevap(405, array('hata' => 'izin verilmeyen yöntem'));
$ham = (string) file_get_contents('php://input', false, null, 0, EN_BUYUK + 1);
if (strlen($ham) > EN_BUYUK) cevap(413, array('hata' => 'belge çok büyük'));
$g = json_decode($ham);
if (!is_object($g)) cevap(400, array('hata' => 'geçersiz JSON'));
$sifre = isset($g->sifre) && is_string($g->sifre) ? $g->sifre : '';

if ($islem === 'durum') {
    if ($sifre !== '' && korumali()) {
        if (engelli()) cevap(429, array('hata' => 'Çok fazla hatalı deneme. 10 dakika sonra yeniden deneyin.'));
        if (!sifre_dogru($sifre)) hatali_deneme();
    }
    cevap(200, array('yazma' => sifre_dogru($sifre), 'korumali' => korumali(), 'kurulum' => !korumali()));
}

if ($islem === 'kurulum') {
    if (korumali()) cevap(409, array('hata' => 'Antrenör şifresi zaten belirlenmiş.'));
    if (preg_match_all('/./us', $sifre) < 6) cevap(400, array('hata' => 'Şifre en az 6 karakter olmalı.'));
    $k = kilitle();
    if (!korumali()) yaz(SIFRE, array('ozet' => password_hash($sifre, PASSWORD_DEFAULT), 'tarih' => date('c')));
    flock($k, LOCK_UN);
    fclose($k);
    cevap(200, array('ok' => true));
}

if ($islem === 'yaz' || $islem === 'sil') {
    $yol = isset($g->yol) && is_string($g->yol) ? $g->yol : '';
    $p = explode('/', $yol);
    if (count($p) !== 2 || !in_array($p[0], $KOLEKSIYONLAR, true) || !preg_match('/^[A-Za-z0-9_-]{1,100}$/', $p[1])) cevap(400, array('hata' => 'geçersiz belge yolu'));
    if (!in_array($p[0], $SIFRESIZ, true)) {
        if (engelli()) cevap(429, array('hata' => 'Çok fazla hatalı deneme. 10 dakika sonra yeniden deneyin.'));
        if (!sifre_dogru($sifre)) {
            if ($sifre !== '') hatali_deneme();
            cevap(403, array('hata' => 'Bu işlem için antrenör şifresi gerekli.'));
        }
    }
    $metin = null;
    if ($islem === 'yaz') {
        if (!isset($g->veri) || !is_object($g->veri)) cevap(400, array('hata' => 'belge bir nesne olmalı'));
        $metin = json_encode($g->veri, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_PRESERVE_ZERO_FRACTION);
        if ($metin === false) cevap(400, array('hata' => 'belge kodlanamadı'));
    }
    $k = kilitle();
    $v = oku(VERI, array('surum' => 0, 'budama' => 0, 'belgeler' => array()));
    if ($islem === 'sil' && !isset($v['belgeler'][$yol])) {
        flock($k, LOCK_UN);
        fclose($k);
        cevap(200, array('surum' => (int) $v['surum']));
    }
    $simdi = time();
    $v['surum'] = (int) $v['surum'] + 1;
    $v['belgeler'][$yol] = array('v' => $v['surum'], 'j' => $metin, 't' => $simdi);
    // eski silme kayıtları temizlenir; o kadar geride kalan cihaz tüm veriyi yeniden alır
    foreach ($v['belgeler'] as $y => $b) {
        if ($b['j'] === null && $b['t'] < $simdi - SILINEN_OMRU) {
            $v['budama'] = max((int) $v['budama'], (int) $b['v']);
            unset($v['belgeler'][$y]);
        }
    }
    yaz(VERI, $v);
    yaz(SURUM, array('surum' => $v['surum']));
    flock($k, LOCK_UN);
    fclose($k);
    cevap(200, array('surum' => $v['surum']));
}

cevap(404, array('hata' => 'bilinmeyen istek'));
