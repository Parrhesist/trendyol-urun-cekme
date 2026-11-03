// Kendi sunucusunda çalışırken (sunucu/public/runtime.js) claude.ai yerine takımın sunucusu kullanılır.
// O durumda bağlantı metinleri claude.ai yerine sunucuyu anlatır, antrenör şifreyle giriş yapar.

type HostRT = {
  selfHosted?: boolean;
  /** sunucu antrenör şifresi istiyor mu */
  isProtected?: () => boolean;
  login?: (password: string) => Promise<boolean>;
  /** paylaşımlı hosting: henüz antrenör şifresi belirlenmemiş (ilk kurulum) */
  needsSetup?: () => boolean;
  setup?: (password: string) => Promise<boolean>;
  logout?: () => void;
  loggedIn?: () => boolean;
};

export const host = (): HostRT | null => {
  const rt = (window as unknown as { claude?: HostRT }).claude;
  return rt?.selfHosted ? rt : null;
};

export const HOSTED = !!host();
