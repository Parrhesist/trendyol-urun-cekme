// Alman trafik işaretleri (StVO Anlage 1–3), sade SVG çizimler.
// İşaret renkleri gerçek tabela renkleridir; tema değişse de aynı kalır.

export type SignCategory = 'tehlike' | 'oncelik' | 'yasak' | 'yon' | 'bilgi' | 'ek';

export const CATEGORIES: { id: SignCategory; title: string; hint: string }[] = [
  { id: 'tehlike', title: 'Tehlike işaretleri', hint: 'Kırmızı kenarlı üçgen: dikkat, ileride tehlike var.' },
  { id: 'oncelik', title: 'Öncelik işaretleri', hint: 'Kavşakta kimin önce geçeceğini belirler.' },
  { id: 'yasak', title: 'Yasak ve sınırlamalar', hint: 'Kırmızı kenarlı daire: bir şey yasak veya sınırlı.' },
  { id: 'yon', title: 'Zorunlu yön ve özel yollar', hint: 'Mavi daire: bunu yapmak zorundasın. Bazı yollar belli araçlara ayrılmıştır.' },
  { id: 'bilgi', title: 'Bilgi işaretleri', hint: 'Mavi veya sarı dikdörtgen: bilgi ve yön.' },
  { id: 'ek', title: 'Ek tabelalar', hint: 'Beyaz küçük tabela: üstündeki işaretin kuralını değiştirir veya sınırlar.' },
];

export interface SignInfo {
  id: string;
  /** Resmi Almanca adı */
  de: string;
  /** Kısa Türkçe anlamı */
  tr: string;
  /** Teslimat şoförü için açıklama */
  desc: string;
  cat: SignCategory;
}

const LIST = [
  // Tehlike
  { id: 'z101', de: 'Zeichen 101 · Gefahrstelle', tr: 'Tehlikeli yer', desc: 'İleride başka işaretle gösterilemeyen bir tehlike var. Genelde altında ek tabela ne olduğunu yazar.', cat: 'tehlike' },
  { id: 'z131', de: 'Zeichen 131 · Lichtzeichenanlage', tr: 'İleride trafik ışığı', desc: 'Beklenmedik bir yerde trafik ışığı var. Yavaşla, kırmızıda durmaya hazır ol.', cat: 'tehlike' },
  { id: 'z133', de: 'Zeichen 133 · Fußgänger', tr: 'Dikkat, yayalar', desc: 'Yola yayalar çıkabilir. Özellikle park etmiş araçların arasından çıkanlara dikkat.', cat: 'tehlike' },
  { id: 'z138', de: 'Zeichen 138 · Radverkehr', tr: 'Dikkat, bisikletliler', desc: 'Bisikletliler yola çıkabilir veya yolu geçebilir.', cat: 'tehlike' },
  // Öncelik
  { id: 'z205', de: 'Zeichen 205 · Vorfahrt gewähren', tr: 'Yol ver', desc: 'Kavşaktaki araçlara yol vermek zorundasın. Gerekirse dur.', cat: 'oncelik' },
  { id: 'z206', de: 'Zeichen 206 · Halt. Vorfahrt gewähren', tr: 'Dur ve yol ver (STOP)', desc: 'Görüş açık olsa bile tam dur, sonra yol ver.', cat: 'oncelik' },
  { id: 'z301', de: 'Zeichen 301 · Vorfahrt', tr: 'Sonraki kavşakta önceliklisin', desc: 'Sadece bir sonraki kavşak veya ağızda geçiş önceliği sende. Sonrasında yine sağdan gelen önceliklidir.', cat: 'oncelik' },
  { id: 'z306', de: 'Zeichen 306 · Vorfahrtstraße', tr: 'Ana yol (öncelikli yol)', desc: 'Bu yolda bitiş tabelasına kadar tüm kavşaklarda önceliğin var.', cat: 'oncelik' },
  { id: 'z307', de: 'Zeichen 307 · Ende der Vorfahrtstraße', tr: 'Ana yolun sonu', desc: 'Öncelik bitiyor. Sonraki kavşaklarda tabelaya bak, yoksa sağdan gelen önceliklidir.', cat: 'oncelik' },
  // Yasak
  { id: 'z250', de: 'Zeichen 250 · Verbot für Fahrzeuge aller Art', tr: 'Her türlü araç giremez', desc: 'Hiçbir araç giremez. Altında “Lieferverkehr frei” gibi ek tabela varsa teslimat için girebilirsin.', cat: 'yasak' },
  { id: 'z253', de: 'Zeichen 253 · Verbot für Kraftfahrzeuge über 3,5 t', tr: '3,5 tonun üstündeki kamyonlar giremez', desc: 'İzin verilen toplam ağırlığı 3,5 tondan fazla olan kamyonlar giremez. Otomobil ve 3,5 tona kadar olan van girebilir.', cat: 'yasak' },
  { id: 'z262', de: 'Zeichen 262 · Tatsächliche Masse', tr: 'Ağırlık sınırı (gerçek ağırlık)', desc: 'Aracın o anki gerçek ağırlığı yazılı değeri aşamaz. Genelde köprülerde görülür.', cat: 'yasak' },
  { id: 'z265', de: 'Zeichen 265 · Tatsächliche Höhe', tr: 'Yükseklik sınırı', desc: 'Aracın yüksekliği yazılı değeri aşamaz. Yüksek tavanlı van’larda alçak geçit ve otopark girişlerinde çok önemli.', cat: 'yasak' },
  { id: 'z267', de: 'Zeichen 267 · Verbot der Einfahrt', tr: 'Girişi yok', desc: 'Bu yöne girmek yasak. Genelde tek yönlü yolun ters ucunda bulunur.', cat: 'yasak' },
  { id: 'z274-30', de: 'Zeichen 274 · Zulässige Höchstgeschwindigkeit', tr: 'Azami hız 30 km/s', desc: 'Bu tabeladan itibaren en fazla 30 km/s.', cat: 'yasak' },
  { id: 'z274-50', de: 'Zeichen 274 · Zulässige Höchstgeschwindigkeit', tr: 'Azami hız 50 km/s', desc: 'Bu tabeladan itibaren en fazla 50 km/s.', cat: 'yasak' },
  { id: 'z274.1', de: 'Zeichen 274.1 · Tempo 30-Zone', tr: '30 km/s bölgesi başlangıcı', desc: 'Bölgenin tüm sokaklarında en fazla 30 km/s. Bölgede genelde sağdan gelen önceliklidir.', cat: 'yasak' },
  { id: 'z276', de: 'Zeichen 276 · Überholverbot', tr: 'Sollama yasağı', desc: 'Çok tekerlekli motorlu araçları sollamak yasak. Bisikletli ve motosikletliler hariç.', cat: 'yasak' },
  { id: 'z282', de: 'Zeichen 282 · Ende sämtlicher Streckenverbote', tr: 'Tüm yasakların sonu', desc: 'Tabelayla konmuş hız ve sollama yasakları biter. Genel kurallar geçerli olur.', cat: 'yasak' },
  { id: 'z283', de: 'Zeichen 283 · Absolutes Haltverbot', tr: 'Mutlak durma yasağı', desc: 'Hiç durulmaz, yükleme-boşaltma için bile.', cat: 'yasak' },
  { id: 'z286', de: 'Zeichen 286 · Eingeschränktes Haltverbot', tr: 'Sınırlı durma yasağı', desc: 'Sadece inip binme ve beklemeden yükleme-boşaltma serbest. Park yasak.', cat: 'yasak' },
  { id: 'z290.1', de: 'Zeichen 290.1 · Eingeschränktes Haltverbot für eine Zone', tr: 'Bölge içinde sınırlı durma yasağı', desc: 'Bölgenin tüm sokaklarında park yasak. Sadece işaretli yerlere park edilir. Yükleme-boşaltma serbest.', cat: 'yasak' },
  // Yön ve özel yollar
  { id: 'z209', de: 'Zeichen 209 · Vorgeschriebene Fahrtrichtung rechts', tr: 'Sadece sağa dönülür', desc: 'Bu noktada sağa dönmek zorundasın.', cat: 'yon' },
  { id: 'z220', de: 'Zeichen 220 · Einbahnstraße', tr: 'Tek yönlü yol', desc: 'Yol sadece ok yönünde kullanılır. Teslimat için bile ters girilmez.', cat: 'yon' },
  { id: 'z237', de: 'Zeichen 237 · Radweg', tr: 'Bisiklet yolu', desc: 'Sadece bisikletliler içindir. Üzerinde durmak ve park etmek yasak.', cat: 'yon' },
  { id: 'z245', de: 'Zeichen 245 · Bussonderfahrstreifen', tr: 'Otobüs şeridi', desc: 'Sadece otobüslere (ve ek tabelayla izin verilenlere) ayrılmış şerit. Teslimat aracı kullanamaz ve üzerinde duramaz.', cat: 'yon' },
  // Bilgi
  { id: 'z224', de: 'Zeichen 224 · Haltestelle', tr: 'Otobüs / tramvay durağı', desc: 'Tabelanın 15 m önünde ve arkasında park yasak.', cat: 'bilgi' },
  { id: 'z310', de: 'Zeichen 310 · Ortstafel (Vorderseite)', tr: 'Yerleşim yeri başlangıcı', desc: 'Buradan itibaren yerleşim yeri içi kurallar ve 50 km/s geçerli.', cat: 'bilgi' },
  { id: 'z311', de: 'Zeichen 311 · Ortstafel (Rückseite)', tr: 'Yerleşim yeri sonu', desc: 'Yerleşim yeri bitti. Buradan itibaren 3,5 tona kadar araçlar için 100 km/s geçerli.', cat: 'bilgi' },
  { id: 'z314', de: 'Zeichen 314 · Parken', tr: 'Park yeri', desc: 'Park etmek serbest. Ek tabelalardaki süre, park diski ve ücret kurallarına uy.', cat: 'bilgi' },
  { id: 'z350', de: 'Zeichen 350 · Fußgängerüberweg', tr: 'Yaya geçidi', desc: 'Geçmek isteyen yayalara yol vermek zorundasın. Geçitte ve önündeki 5 m içinde durmak yasak.', cat: 'bilgi' },
  { id: 'z357', de: 'Zeichen 357 · Sackgasse', tr: 'Çıkmaz sokak', desc: 'Sokağın çıkışı yok. Araçla girersen dönmen veya geri çıkman gerekir. Girişte park edip yürümeyi düşün.', cat: 'bilgi' },
  // Ek tabelalar
  { id: 'zz-liefer', de: 'Zusatzzeichen · Lieferverkehr frei', tr: 'Teslimat araçları serbest', desc: 'Üstteki yasak teslimat ve yükleme yapan araçlar için geçerli değil.', cat: 'ek' },
  { id: 'zz-anlieger', de: 'Zusatzzeichen 1020-30 · Anlieger frei', tr: 'Bölgede işi olanlar serbest', desc: 'Orada oturanlar ve orada işi olanlar girebilir. Paket teslim etmek de buna dahildir.', cat: 'ek' },
  { id: 'zz-zeit', de: 'Zusatzzeichen · werktags 8–18 h', tr: 'Sadece hafta içi ve cumartesi 8–18 arası', desc: 'Üstteki kural sadece bu saatlerde geçerli. Almanca “werktags” pazartesiden cumartesiye kadar demektir.', cat: 'ek' },
] as const satisfies readonly SignInfo[];

export type SignId = (typeof LIST)[number]['id'];
export const SIGNS: readonly (SignInfo & { id: SignId })[] = LIST;
export const signInfo = (id: SignId) => SIGNS.find((s) => s.id === id)!;
export const SIGN_NAMES = Object.fromEntries(SIGNS.map((s) => [s.id, s.de])) as Record<SignId, string>;

const RED = '#C1121C';
const BLUE = '#1E4FA0';
const YELLOW = '#F5B800';
const GREEN = '#0B7A3E';
const BLACK = '#111111';
const EDGE = '#9AA0AA';
const FONT = 'Arial, Helvetica, sans-serif';

/** Dikdörtgen işaretlerin çizim alanı; diğerleri 100×100. */
const BOX: Partial<Record<SignId, [number, number]>> = {
  z220: [160, 56],
  z310: [150, 100],
  z311: [150, 100],
  'z274.1': [100, 124],
  'z290.1': [100, 124],
  'zz-liefer': [150, 56],
  'zz-anlieger': [150, 56],
  'zz-zeit': [150, 56],
};

/** Yatay (geniş) işaret mi? Listelerde daha geniş yer ayrılır. */
export const isWide = (id: SignId) => {
  const b = BOX[id];
  return !!b && b[0] > b[1];
};

export function Sign({ id, size = 72 }: { id: SignId; size?: number }) {
  const [w, h] = BOX[id] ?? [100, 100];
  const k = size / Math.max(w, h);
  return (
    <svg className="sign" viewBox={`0 0 ${w} ${h}`} width={w * k} height={h * k} role="img" aria-label={SIGN_NAMES[id]}>
      {draw(id)}
    </svg>
  );
}

/* ---------- Ortak parçalar ---------- */

function ring(inner: string, ringColor = RED) {
  return (
    <>
      <circle cx="50" cy="50" r="47" fill="#fff" stroke={EDGE} strokeWidth="1" />
      <circle cx="50" cy="50" r="44" fill={ringColor} />
      <circle cx="50" cy="50" r="33" fill={inner} />
    </>
  );
}

function triangle(children?: JSX.Element) {
  return (
    <>
      <path d="M50 6 L96 88 H4 Z" fill="#fff" stroke={EDGE} strokeWidth="1" strokeLinejoin="round" />
      <path d="M50 11 L91.5 85 H8.5 Z" fill={RED} />
      <path d="M50 26 L79 78 H21 Z" fill="#fff" />
      {children}
    </>
  );
}

function blueSquare(children: JSX.Element) {
  return (
    <>
      <rect x="4" y="4" width="92" height="92" rx="10" fill="#fff" stroke={EDGE} strokeWidth="1" />
      <rect x="8" y="8" width="84" height="84" rx="7" fill={BLUE} />
      {children}
    </>
  );
}

const Bike = ({ color, at, s }: { color: string; at: [number, number]; s: number }) => (
  <g transform={`translate(${at[0]} ${at[1]}) scale(${s}) translate(-50 -52)`} fill="none" stroke={color} strokeWidth="5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="28" cy="62" r="13" />
    <circle cx="72" cy="62" r="13" />
    <path d="M28 62 H49 L40 42 Z M40 42 H64 L49 62 M64 42 L72 62 M58 34 H68 M34 40 H46" />
  </g>
);

const Walker = ({ color, at, s }: { color: string; at: [number, number]; s: number }) => (
  <g transform={`translate(${at[0]} ${at[1]}) scale(${s}) translate(-50 -50)`}>
    <circle cx="53" cy="20" r="8" fill={color} />
    <path d="M51 32 L46 58 M50 38 L38 50 M50 38 L62 47 M46 58 L35 80 M46 58 L60 80" fill="none" stroke={color} strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" />
  </g>
);

const CarRear = ({ color, x, y }: { color: string; x: number; y: number }) => (
  <g transform={`translate(${x} ${y})`} fill={color}>
    <path d="M-10 -1 L-7 -10 H7 L10 -1 H12 V8 H-12 V-1 Z" />
    <rect x="-11" y="8" width="5" height="4" rx="1" />
    <rect x="6" y="8" width="5" height="4" rx="1" />
  </g>
);

function textPlate(lines: string[]) {
  return (
    <>
      <rect x="2" y="2" width="146" height="52" rx="4" fill="#fff" stroke={BLACK} strokeWidth="2.5" />
      {lines.length === 1 ? (
        <text x="75" y="34" textAnchor="middle" fontSize="17" fontWeight="700" fill={BLACK} fontFamily={FONT} {...(lines[0].length > 13 ? { textLength: 132, lengthAdjust: 'spacingAndGlyphs' } : {})}>{lines[0]}</text>
      ) : (
        lines.map((l, i) => (
          <text key={l} x="75" y={25 + i * 19} textAnchor="middle" fontSize="16" fontWeight="700" fill={BLACK} fontFamily={FONT}>{l}</text>
        ))
      )}
    </>
  );
}

function zone(inner: JSX.Element) {
  return (
    <>
      <rect x="2" y="2" width="96" height="120" rx="6" fill="#fff" stroke={EDGE} strokeWidth="1.5" />
      <g transform="translate(50 47) scale(0.82) translate(-50 -50)">{inner}</g>
      <text x="50" y="113" textAnchor="middle" fontSize="22" fontWeight="700" fill={BLACK} fontFamily={FONT}>ZONE</text>
    </>
  );
}

function ortstafel(end: boolean) {
  return (
    <>
      <rect x="2" y="2" width="146" height="96" rx="5" fill={YELLOW} stroke={BLACK} strokeWidth="3" />
      <rect x="8" y="8" width="134" height="84" rx="3" fill="none" stroke={BLACK} strokeWidth="2" />
      <text x="75" y="50" textAnchor="middle" fontSize="21" fontWeight="700" fill={BLACK} fontFamily={FONT}>Musterstadt</text>
      <text x="75" y="74" textAnchor="middle" fontSize="12" fill={BLACK} fontFamily={FONT}>Kreis Beispiel</text>
      {end && <line x1="14" y1="86" x2="136" y2="14" stroke={RED} strokeWidth="9" />}
    </>
  );
}

/* ---------- İşaretler ---------- */

function draw(id: SignId): JSX.Element {
  switch (id) {
    case 'z101':
      return triangle(
        <>
          <rect x="46.5" y="40" width="7" height="22" rx="2" fill={BLACK} />
          <circle cx="50" cy="69" r="3.8" fill={BLACK} />
        </>,
      );
    case 'z131':
      return triangle(
        <>
          <rect x="43" y="39" width="14" height="35" rx="3" fill={BLACK} />
          <circle cx="50" cy="46" r="4" fill={RED} />
          <circle cx="50" cy="56.5" r="4" fill={YELLOW} />
          <circle cx="50" cy="67" r="4" fill="#1E9E4A" />
        </>,
      );
    case 'z133':
      return triangle(<Walker color={BLACK} at={[50, 58]} s={0.4} />);
    case 'z138':
      return triangle(<Bike color={BLACK} at={[50, 62]} s={0.42} />);
    case 'z205':
      return (
        <>
          <path d="M4 12 H96 L50 94 Z" fill="#fff" stroke={EDGE} strokeWidth="1" strokeLinejoin="round" />
          <path d="M9 15 H91 L50 89 Z" fill={RED} />
          <path d="M25 24 H75 L50 69 Z" fill="#fff" />
        </>
      );
    case 'z206':
      return (
        <>
          <path d="M31 3 H69 L97 31 V69 L69 97 H31 L3 69 V31 Z" fill="#fff" stroke={EDGE} strokeWidth="1" />
          <path d="M32.5 7 H67.5 L93 32.5 V67.5 L67.5 93 H32.5 L7 67.5 V32.5 Z" fill={RED} />
          <text x="50" y="59" textAnchor="middle" fontSize="27" fontWeight="700" fill="#fff" fontFamily={FONT}>STOP</text>
        </>
      );
    case 'z301':
      return triangle(
        <>
          <rect x="46" y="38" width="8" height="37" fill={BLACK} />
          <rect x="35" y="50" width="30" height="3.5" fill={BLACK} />
        </>,
      );
    case 'z306':
    case 'z307':
      return (
        <>
          <defs>
            <clipPath id="c307">
              <path d="M50 18 L82 50 L50 82 L18 50 Z" />
            </clipPath>
          </defs>
          <path d="M50 2 L98 50 L50 98 L2 50 Z" fill="#fff" stroke={EDGE} strokeWidth="1" />
          <path d="M50 18 L82 50 L50 82 L18 50 Z" fill={YELLOW} />
          {id === 'z307' && (
            <g clipPath="url(#c307)" stroke={BLACK} strokeWidth="3.5">
              {[-20, -10, 0, 10, 20].map((o) => (
                <line key={o} x1={0 + o} y1={100 + o} x2={100 + o} y2={0 + o} />
              ))}
            </g>
          )}
        </>
      );
    case 'z224':
      return (
        <>
          <circle cx="50" cy="50" r="47" fill={GREEN} />
          <circle cx="50" cy="50" r="39" fill={YELLOW} />
          <text x="50" y="66" textAnchor="middle" fontSize="46" fontWeight="700" fill={GREEN} fontFamily={FONT}>H</text>
        </>
      );
    case 'z250':
      return ring('#fff');
    case 'z253':
      return (
        <>
          {ring('#fff')}
          <g fill={BLACK}>
            <rect x="24" y="36" width="34" height="23" rx="1.5" />
            <path d="M60 42 H70 L77 50 V59 H60 Z" />
            <circle cx="33" cy="62" r="5" />
            <circle cx="69" cy="62" r="5" />
          </g>
          <path d="M63 45 H68.5 L73 50 H63 Z" fill="#fff" />
        </>
      );
    case 'z262':
    case 'z265':
      return (
        <>
          {ring('#fff')}
          <text x="50" y="60" textAnchor="middle" fontSize={id === 'z262' ? 25 : 24} fontWeight="700" fill={BLACK} fontFamily={FONT}>
            {id === 'z262' ? '5,5t' : '3,8m'}
          </text>
          {id === 'z265' && (
            <g fill={BLACK}>
              <path d="M42 23 H58 L50 31 Z" />
              <path d="M42 77 H58 L50 69 Z" />
            </g>
          )}
        </>
      );
    case 'z267':
      return (
        <>
          <circle cx="50" cy="50" r="47" fill="#fff" stroke={EDGE} strokeWidth="1" />
          <circle cx="50" cy="50" r="44" fill={RED} />
          <rect x="18" y="42" width="64" height="16" fill="#fff" />
        </>
      );
    case 'z274-30':
    case 'z274-50':
      return (
        <>
          {ring('#fff')}
          <text x="50" y="64" textAnchor="middle" fontSize="40" fontWeight="700" fill={BLACK} fontFamily={FONT}>
            {id === 'z274-30' ? '30' : '50'}
          </text>
        </>
      );
    case 'z274.1':
      return zone(
        <>
          {ring('#fff')}
          <text x="50" y="64" textAnchor="middle" fontSize="40" fontWeight="700" fill={BLACK} fontFamily={FONT}>30</text>
        </>,
      );
    case 'z276':
      return (
        <>
          {ring('#fff')}
          <CarRear color={RED} x={36} y={50} />
          <CarRear color={BLACK} x={64} y={50} />
        </>
      );
    case 'z282':
      return (
        <>
          <defs>
            <clipPath id="c282">
              <circle cx="50" cy="50" r="44" />
            </clipPath>
          </defs>
          <circle cx="50" cy="50" r="46" fill="#fff" stroke={EDGE} strokeWidth="1.5" />
          <g clipPath="url(#c282)" stroke={BLACK} strokeWidth="3.5">
            {[-24, -12, 0, 12, 24].map((o) => (
              <line key={o} x1={0 + o} y1={100 + o} x2={100 + o} y2={0 + o} />
            ))}
          </g>
        </>
      );
    case 'z283':
      return (
        <>
          {ring(BLUE)}
          <g stroke={RED} strokeWidth="11">
            <line x1="24" y1="24" x2="76" y2="76" />
            <line x1="76" y1="24" x2="24" y2="76" />
          </g>
        </>
      );
    case 'z286':
      return (
        <>
          {ring(BLUE)}
          <line x1="24" y1="24" x2="76" y2="76" stroke={RED} strokeWidth="11" />
        </>
      );
    case 'z290.1':
      return zone(
        <>
          {ring(BLUE)}
          <line x1="24" y1="24" x2="76" y2="76" stroke={RED} strokeWidth="11" />
        </>,
      );
    case 'z209':
      return (
        <>
          <circle cx="50" cy="50" r="47" fill="#fff" stroke={EDGE} strokeWidth="1" />
          <circle cx="50" cy="50" r="44" fill={BLUE} />
          <path d="M38 78 V52 Q38 40 50 40 H58" fill="none" stroke="#fff" strokeWidth="10" />
          <path d="M56 28 L74 40 L56 52 Z" fill="#fff" />
        </>
      );
    case 'z237':
      return (
        <>
          <circle cx="50" cy="50" r="47" fill="#fff" stroke={EDGE} strokeWidth="1" />
          <circle cx="50" cy="50" r="44" fill={BLUE} />
          <Bike color="#fff" at={[50, 52]} s={0.62} />
        </>
      );
    case 'z245':
      return blueSquare(
        <>
          <g fill="#fff">
            <rect x="26" y="22" width="48" height="36" rx="5" />
            <circle cx="36" cy="60" r="5" />
            <circle cx="64" cy="60" r="5" />
          </g>
          <g fill={BLUE}>
            <rect x="30" y="27" width="12" height="12" rx="1.5" />
            <rect x="44" y="27" width="12" height="12" rx="1.5" />
            <rect x="58" y="27" width="12" height="12" rx="1.5" />
          </g>
          <text x="50" y="86" textAnchor="middle" fontSize="19" fontWeight="700" fill="#fff" fontFamily={FONT}>BUS</text>
        </>,
      );
    case 'z220':
      return (
        <>
          <rect x="1" y="1" width="158" height="54" rx="4" fill={BLUE} stroke={EDGE} strokeWidth="1" />
          <path d="M10 17 H118 V7 L150 28 L118 49 V39 H10 Z" fill="#fff" />
          <text x="66" y="33" textAnchor="middle" fontSize="13.5" fontWeight="700" fill={BLACK} fontFamily={FONT}>Einbahnstraße</text>
        </>
      );
    case 'z310':
      return ortstafel(false);
    case 'z311':
      return ortstafel(true);
    case 'z314':
      return blueSquare(
        <text x="50" y="72" textAnchor="middle" fontSize="62" fontWeight="700" fill="#fff" fontFamily={FONT}>P</text>,
      );
    case 'z350':
      return blueSquare(
        <>
          <path d="M50 14 L88 84 H12 Z" fill="#fff" />
          <g fill={BLACK}>
            {[25, 37, 49, 61].map((x) => (
              <rect key={x} x={x} y="75" width="8" height="5" />
            ))}
          </g>
          <Walker color={BLACK} at={[50, 54]} s={0.42} />
        </>,
      );
    case 'z357':
      return blueSquare(
        <>
          <rect x="41" y="34" width="18" height="52" fill="#fff" />
          <rect x="20" y="16" width="60" height="20" fill={RED} stroke="#fff" strokeWidth="3" />
        </>,
      );
    case 'zz-liefer':
      return textPlate(['Lieferverkehr frei']);
    case 'zz-anlieger':
      return textPlate(['Anlieger frei']);
    case 'zz-zeit':
      return textPlate(['werktags', '8–18 h']);
  }
}
