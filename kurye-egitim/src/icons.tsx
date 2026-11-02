import type { IconName } from './types';

const PATHS: Record<IconName, JSX.Element> = {
  road: <path d="M8 3 5 21M16 3l3 18M12 4v3m0 5v3m0 5v1" />,
  parking: (
    <>
      <rect x="4" y="3" width="16" height="18" rx="3" />
      <path d="M10 17V7h3a3 3 0 0 1 0 6h-3" />
    </>
  ),
  law: <path d="M12 3v18M7 21h10M5 7h14M5 7l-3 7a3 3 0 0 0 6 0L5 7Zm14 0-3 7a3 3 0 0 0 6 0l-3-7Z" />,
  steering: (
    <>
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="2.5" />
      <path d="M3.5 10.5 9.6 11.6M20.5 10.5l-6.1 1.1M12 14.5V21" />
    </>
  ),
  wrench: <path d="M14.7 6.3a4 4 0 0 0-5.2 5.2L3.6 17.4a1.4 1.4 0 0 0 2 2l5.9-5.9a4 4 0 0 0 5.2-5.2l-2.5 2.5-2-.5-.5-2 2.5-2Z" />,
  heart: <path d="M12 20s-7.5-4.6-7.5-10A4.3 4.3 0 0 1 12 7.4 4.3 4.3 0 0 1 19.5 10c0 5.4-7.5 10-7.5 10Z" />,
  home: <path d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-4.5v-6h-5v6H5a1 1 0 0 1-1-1v-9.5Z" />,
  book: <path d="M4 5a2 2 0 0 1 2-2h13v15H6a2 2 0 0 0-2 2V5Zm0 15a2 2 0 0 0 2 2h13v-4" />,
  check: (
    <>
      <rect x="4" y="3" width="16" height="18" rx="3" />
      <path d="m8.5 12 2.5 2.5 4.5-5" />
    </>
  ),
  dict: (
    <>
      <path d="M4 6h8M8 4v2m3 0c-.6 3.5-3.2 6.3-6 7.5M6.5 9c1 1.8 2.6 3.2 4.5 4" />
      <path d="m12 20 4-9 4 9m-6.8-2.5h5.6" />
    </>
  ),
  gear: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 2.8v2.4m0 13.6v2.4M2.8 12h2.4m13.6 0h2.4M5.5 5.5l1.7 1.7m9.6 9.6 1.7 1.7M5.5 18.5l1.7-1.7m9.6-9.6 1.7-1.7" />
    </>
  ),
  chevron: <path d="m9 6 6 6-6 6" />,
  back: <path d="m15 5-7 7 7 7" />,
  clock: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </>
  ),
  repeat: <path d="M4 12a8 8 0 0 1 13.7-5.6L20 9M20 4v5h-5M20 12a8 8 0 0 1-13.7 5.6L4 15m0 5v-5h5" />,
  bolt: <path d="M13 3 5 13.5h6L10 21l8-10.5h-6L13 3Z" />,
  close: <path d="M6 6l12 12M18 6 6 18" />,
  flame: <path d="M12 21c3.9 0 6.5-2.6 6.5-6.2 0-4.3-3.6-6.4-4.4-10.3-2.4 1.6-3.6 4-3.4 6.4-1.3-.7-2-2-2.1-3.4C6.9 9.3 5.5 11.7 5.5 14.8 5.5 18.4 8.1 21 12 21Z" />,
  sign: (
    <>
      <path d="M12 3 21 19H3L12 3Z" />
      <path d="M12 10v4m0 2.5v.5" />
    </>
  ),
  map: (
    <>
      <path d="M3 6.5 9 4l6 2.5L21 4v13.5L15 20l-6-2.5L3 20V6.5Z" />
      <path d="M9 4v13.5M15 6.5V20" />
    </>
  ),
  info: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v6m0-9.5v.5" />
    </>
  ),
};

export function Icon({ name, size = 22 }: { name: IconName; size?: number }) {
  return (
    <svg
      className="icon"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {PATHS[name]}
    </svg>
  );
}
