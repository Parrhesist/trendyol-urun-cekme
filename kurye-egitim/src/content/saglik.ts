import type { Module } from '../types';

export const saglik: Module = {
  id: 'saglik',
  title: 'Sağlık ve teslimat pratiği',
  desc: 'Kaldırma, yorgunluk, köpekler, müşteri',
  icon: 'heart',
  lessons: [
    {
      id: 'ergonomi',
      title: 'Doğru kaldırma ve araçta hareket',
      minutes: 4,
      summary: 'Bel ve diz sağlığı, kayma ve düşme kazaları.',
      blocks: [
        { t: 'p', text: 'Teslimat şoförlerinde iş kazalarının büyük kısmı trafikte değil, araçtan inip binerken ve paket taşırken olur: kayma, düşme, bel incinmesi.' },
        { t: 'steps', items: ['Paketin yanına yaklaş, ayaklarını omuz genişliğinde aç.', 'Belini değil, dizlerini bük.', 'Paketi vücuduna yakın tut.', 'Bacaklarınla kalk, belini döndürme. Dönmek için ayaklarını hareket ettir.', 'Ağır veya “Schwer” etiketli paketlerde el arabası kullan.'] },
        { t: 'h', text: 'Araçta inip binme' },
        { t: 'list', items: ['Kabinden ve yük bölümünden atlama. Basamağı kullan.', 'Üç nokta teması: iki el bir ayak veya iki ayak bir el her zaman araçta olsun.', 'Kaymaz tabanlı, bileği destekleyen iş ayakkabısı giy.', 'Yük bölümünde paketleri yere bırakma, takılıp düşersin.'] },
        { t: 'tip', text: 'Gün içinde su içmeyi unutma. Hafif susuzluk bile dikkat ve tepki süresini düşürür.' },
        { t: 'terms', items: [['Heben und Tragen', 'Kaldırma ve taşıma'], ['Sicherheitsschuhe', 'İş güvenliği ayakkabısı'], ['Sackkarre', 'El arabası'], ['Arbeitsunfall', 'İş kazası']] },
      ],
      quiz: [
        {
          id: 'er-1',
          q: 'Ağır bir paketi yerden kaldırırken hangisi doğru?',
          options: ['Bacaklar düz, beli bükerek', 'Dizleri bükerek, paketi vücuda yakın tutarak', 'Tek elle hızlıca', 'Kaldırırken belden dönerek'],
          answer: 1,
          why: 'Yükü bacaklar taşımalı, bel düz kalmalı.',
        },
        {
          id: 'er-2',
          q: 'Yük bölümünden inerken ne yaparsın?',
          options: ['Atlarım, daha hızlı', 'Basamağı kullanır, üç nokta temasıyla inerim', 'Paketi önce atarım', 'Kapıya tutunup sallanırım'],
          answer: 1,
          why: 'Atlamak diz ve ayak bileği yaralanmalarının en sık nedenidir.',
        },
        {
          id: 'er-3',
          q: 'Teslimat sırasında iş yolunda yaralanırsan bu nedir?',
          options: ['Özel kaza', 'İş kazası, işverene bildirilir', 'Önemsiz', 'Trafik kazası'],
          answer: 1,
          why: 'İş sırasında olan kaza iş kazasıdır ve meslek sigortası (Berufsgenossenschaft) kapsamındadır. Mutlaka bildir.',
        },
      ],
    },
    {
      id: 'yorgunluk',
      title: 'Yorgunluk, stres ve zor durumlar',
      minutes: 4,
      summary: 'Mikro uyku, zaman baskısı, köpekler ve müşteriyle iletişim.',
      blocks: [
        { t: 'p', text: 'Zaman baskısı hata yaptırır. Bir paketi geç teslim etmek, bir kazanın ya da cezanın yanında çok küçük bir kayıptır.' },
        { t: 'h', text: 'Mikro uyku belirtileri' },
        { t: 'list', items: ['Sık esneme ve göz kırpma', 'Son birkaç yüz metreyi hatırlamamak', 'Şeritten kaymak', 'Tabelaları kaçırmak'] },
        { t: 'warn', text: 'Bu belirtilerden biri varsa güvenli bir yerde dur. Kahve ve cam açmak sadece kısa süre yardımcı olur. 10–20 dakikalık bir uyku veya mola daha etkilidir.' },
        { t: 'h', text: 'Köpekler' },
        { t: 'list', items: ['Bahçe kapısında köpek varsa içeri girme. Sahibini ara veya zile bas.', 'Köpeğe doğrudan bakma, koşma, sırtını dönme.', 'Paketi aranızda kalkan gibi tut.', 'Isırılırsan yarayı yıka, doktora git, işverene bildir.'] },
        { t: 'h', text: 'Müşteriyle iletişim' },
        { t: 'p', text: 'Kısa, nazik ve net ol. Basit Almanca cümleler çoğu durumu çözer.' },
        { t: 'terms', items: [['Guten Tag, ein Paket für Sie.', 'İyi günler, size bir paket var.'], ['Können Sie das Paket für Ihren Nachbarn annehmen?', 'Komşunuzun paketini alabilir misiniz?'], ['Bitte hier unterschreiben.', 'Lütfen buraya imza atın.'], ['Ich bin gleich wieder weg.', 'Hemen gidiyorum.'], ['Entschuldigung, ich muss weiter.', 'Kusura bakmayın, devam etmem gerekiyor.']] },
      ],
      quiz: [
        {
          id: 'yo-1',
          q: 'Sürerken sık esniyor ve son kavşağı hatırlamıyorsun. En iyi çözüm nedir?',
          options: ['Camı açıp devam etmek', 'Güvenli yerde durup kısa mola veya uyku', 'Müziği açmak', 'Hızı artırıp işi erken bitirmek'],
          answer: 1,
          why: 'Mikro uyku belirtilerine karşı tek etkili çözüm durmak ve dinlenmektir.',
        },
        {
          id: 'yo-2',
          q: 'Bahçede bağlı olmayan bir köpek var. Ne yaparsın?',
          options: ['Hızlıca koşup paketi bırakırım', 'İçeri girmem, sahibine haber veririm', 'Köpeği yemle uzaklaştırırım', 'Paketi bahçeye atarım'],
          answer: 1,
          why: 'Güvenliğin paketten önemlidir. Sahibine ulaşmadan bahçeye girme.',
        },
        {
          id: 'yo-3',
          q: '“Bitte hier unterschreiben” ne demektir?',
          options: ['Lütfen kapıyı açın', 'Lütfen buraya imza atın', 'Paket komşuda', 'Teşekkürler'],
          answer: 1,
          why: 'unterschreiben = imzalamak.',
        },
      ],
    },
  ],
};
