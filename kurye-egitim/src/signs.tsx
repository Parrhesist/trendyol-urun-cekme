// Alman trafik işaretleri (StVO Anlage 1–3), sade SVG çizimler.
// İşaret renkleri gerçek tabela renkleridir; tema değişse de aynı kalır.

export type SignId =
  | 'z101' | 'z205' | 'z206' | 'z224' | 'z250' | 'z267'
  | 'z274-30' | 'z274-50' | 'z282' | 'z283' | 'z286' | 'z306' | 'z314';

export const SIGN_NAMES: Record<SignId, string> = {
  z101: 'Zeichen 101 · Gefahrstelle',
  z205: 'Zeichen 205 · Vorfahrt gewähren',
  z206: 'Zeichen 206 · Halt. Vorfahrt gewähren (Stop)',
  z224: 'Zeichen 224 · Haltestelle',
  z250: 'Zeichen 250 · Verbot für Fahrzeuge aller Art',
  z267: 'Zeichen 267 · Verbot der Einfahrt',
  'z274-30': 'Zeichen 274 · Zulässige Höchstgeschwindigkeit 30',
  'z274-50': 'Zeichen 274 · Zulässige Höchstgeschwindigkeit 50',
  z282: 'Zeichen 282 · Ende sämtlicher Streckenverbote',
  z283: 'Zeichen 283 · Absolutes Haltverbot',
  z286: 'Zeichen 286 · Eingeschränktes Haltverbot',
  z306: 'Zeichen 306 · Vorfahrtstraße',
  z314: 'Zeichen 314 · Parken',
};

const RED = '#C1121C';
const BLUE = '#1E4FA0';
const YELLOW = '#F5B800';
const GREEN = '#0B7A3E';
const EDGE = '#9AA0AA';

export function Sign({ id, size = 72 }: { id: SignId; size?: number }) {
  return (
    <svg
      className="sign"
      viewBox="0 0 100 100"
      width={size}
      height={size}
      role="img"
      aria-label={SIGN_NAMES[id]}
    >
      {draw(id)}
    </svg>
  );
}

function ring(inner: string, ringColor = RED) {
  return (
    <>
      <circle cx="50" cy="50" r="47" fill="#fff" stroke={EDGE} strokeWidth="1" />
      <circle cx="50" cy="50" r="44" fill={ringColor} />
      <circle cx="50" cy="50" r="33" fill={inner} />
    </>
  );
}

function draw(id: SignId) {
  switch (id) {
    case 'z101':
      return (
        <>
          <path d="M50 6 L96 88 H4 Z" fill="#fff" stroke={EDGE} strokeWidth="1" strokeLinejoin="round" />
          <path d="M50 11 L91.5 85 H8.5 Z" fill={RED} strokeLinejoin="round" />
          <path d="M50 27 L77 75 H23 Z" fill="#fff" />
          <rect x="46.5" y="40" width="7" height="22" rx="2" fill="#111" />
          <circle cx="50" cy="68" r="3.8" fill="#111" />
        </>
      );
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
          <text x="50" y="59" textAnchor="middle" fontSize="27" fontWeight="700" fill="#fff" fontFamily="Arial, Helvetica, sans-serif">STOP</text>
        </>
      );
    case 'z224':
      return (
        <>
          <circle cx="50" cy="50" r="47" fill={GREEN} />
          <circle cx="50" cy="50" r="39" fill={YELLOW} />
          <text x="50" y="66" textAnchor="middle" fontSize="46" fontWeight="700" fill={GREEN} fontFamily="Arial, Helvetica, sans-serif">H</text>
        </>
      );
    case 'z250':
      return ring('#fff');
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
          <text x="50" y="64" textAnchor="middle" fontSize="40" fontWeight="700" fill="#111" fontFamily="Arial, Helvetica, sans-serif">
            {id === 'z274-30' ? '30' : '50'}
          </text>
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
          <g clipPath="url(#c282)" stroke="#111" strokeWidth="3.5">
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
    case 'z306':
      return (
        <>
          <path d="M50 2 L98 50 L50 98 L2 50 Z" fill="#fff" stroke={EDGE} strokeWidth="1" />
          <path d="M50 18 L82 50 L50 82 L18 50 Z" fill={YELLOW} />
        </>
      );
    case 'z314':
      return (
        <>
          <rect x="4" y="4" width="92" height="92" rx="10" fill="#fff" stroke={EDGE} strokeWidth="1" />
          <rect x="8" y="8" width="84" height="84" rx="7" fill={BLUE} />
          <text x="50" y="72" textAnchor="middle" fontSize="62" fontWeight="700" fill="#fff" fontFamily="Arial, Helvetica, sans-serif">P</text>
        </>
      );
  }
}
