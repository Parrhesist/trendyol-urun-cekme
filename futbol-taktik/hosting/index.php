<?php
// Hostingin varsayılan sayfası yerine uygulama açılsın (sunucu index.php'yi index.html'den önce arar)
header('Content-Type: text/html; charset=utf-8');
header('Cache-Control: no-cache');
readfile(__DIR__ . '/index.html');
