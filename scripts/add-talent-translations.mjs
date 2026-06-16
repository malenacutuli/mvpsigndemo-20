import fs from 'node:fs';
import path from 'node:path';

const translations = {
  en: {
    eyebrow: 'For Talent',
    title1: 'AI needs your face.',
    title2: 'Now it has to pay for it.',
    body: "Axessplayer is the registry where humans license their face, voice, and signing for AI use — to brands, broadcasters, and AI labs. Verify once. Set your terms. Earn every time it's used.",
    bullets: { free: 'Free to join', signup: '10-minute signup', approve: 'You approve every job' },
    form: {
      name: 'Name', namePlaceholder: 'Your name',
      contact: 'Contact', contactPlaceholder: 'Email or phone',
      location: 'Location', locationPlaceholder: 'City, country',
      languages: 'Languages', languagesPlaceholder: 'Languages you speak / sign',
      about: 'Tell us about yourself', aboutPlaceholder: 'Acting, voice, signing, modeling, hosting…',
      submit: 'License my face',
    },
  },
  es: {
    eyebrow: 'Para talento',
    title1: 'La IA necesita tu rostro.',
    title2: 'Ahora tiene que pagar por él.',
    body: 'Axessplayer es el registro donde las personas licencian su rostro, voz y signado para uso de IA — a marcas, emisoras y laboratorios. Verifica una vez. Pon tus condiciones. Cobra cada vez que se use.',
    bullets: { free: 'Inscripción gratuita', signup: 'Registro en 10 minutos', approve: 'Apruebas cada trabajo' },
    form: {
      name: 'Nombre', namePlaceholder: 'Tu nombre',
      contact: 'Contacto', contactPlaceholder: 'Email o teléfono',
      location: 'Ubicación', locationPlaceholder: 'Ciudad, país',
      languages: 'Idiomas', languagesPlaceholder: 'Idiomas que hablas / signas',
      about: 'Cuéntanos sobre ti', aboutPlaceholder: 'Actuación, voz, lengua de signos, modelaje, presentación…',
      submit: 'Licencia mi rostro',
    },
  },
  fr: {
    eyebrow: 'Pour les talents',
    title1: "L'IA a besoin de votre visage.",
    title2: 'Maintenant elle doit payer.',
    body: "Axessplayer est le registre où les humains licencient leur visage, voix et signes pour l'IA — aux marques, diffuseurs et laboratoires. Vérifiez une fois. Fixez vos conditions. Gagnez à chaque utilisation.",
    bullets: { free: 'Inscription gratuite', signup: 'Inscription en 10 min', approve: 'Vous validez chaque mission' },
    form: {
      name: 'Nom', namePlaceholder: 'Votre nom',
      contact: 'Contact', contactPlaceholder: 'Email ou téléphone',
      location: 'Lieu', locationPlaceholder: 'Ville, pays',
      languages: 'Langues', languagesPlaceholder: 'Langues parlées / signées',
      about: 'Parlez-nous de vous', aboutPlaceholder: 'Jeu, voix, langue des signes, mannequinat, animation…',
      submit: 'Licencier mon visage',
    },
  },
  de: {
    eyebrow: 'Für Talente',
    title1: 'KI braucht dein Gesicht.',
    title2: 'Jetzt muss sie dafür zahlen.',
    body: 'Axessplayer ist das Register, in dem Menschen ihr Gesicht, ihre Stimme und Gebärden für KI-Nutzung lizenzieren — an Marken, Sender und KI-Labore. Einmal verifizieren. Bedingungen festlegen. Bei jeder Nutzung verdienen.',
    bullets: { free: 'Kostenlos beitreten', signup: '10-Minuten-Anmeldung', approve: 'Du genehmigst jeden Auftrag' },
    form: {
      name: 'Name', namePlaceholder: 'Dein Name',
      contact: 'Kontakt', contactPlaceholder: 'E-Mail oder Telefon',
      location: 'Ort', locationPlaceholder: 'Stadt, Land',
      languages: 'Sprachen', languagesPlaceholder: 'Sprachen, die du sprichst / gebärdest',
      about: 'Erzähl uns von dir', aboutPlaceholder: 'Schauspiel, Stimme, Gebärden, Modeling, Moderation…',
      submit: 'Mein Gesicht lizenzieren',
    },
  },
  pt: {
    eyebrow: 'Para talentos',
    title1: 'A IA precisa do seu rosto.',
    title2: 'Agora tem de pagar por ele.',
    body: 'O Axessplayer é o registo onde as pessoas licenciam o seu rosto, voz e língua gestual para uso de IA — a marcas, emissoras e laboratórios. Verifique uma vez. Defina as condições. Ganhe a cada utilização.',
    bullets: { free: 'Inscrição gratuita', signup: 'Registo em 10 minutos', approve: 'Você aprova cada trabalho' },
    form: {
      name: 'Nome', namePlaceholder: 'O seu nome',
      contact: 'Contacto', contactPlaceholder: 'Email ou telefone',
      location: 'Localização', locationPlaceholder: 'Cidade, país',
      languages: 'Idiomas', languagesPlaceholder: 'Idiomas que fala / gestualiza',
      about: 'Fale-nos sobre si', aboutPlaceholder: 'Atuação, voz, língua gestual, modelo, apresentação…',
      submit: 'Licenciar o meu rosto',
    },
  },
  it: {
    eyebrow: 'Per i talenti',
    title1: "L'IA ha bisogno del tuo volto.",
    title2: 'Ora deve pagarlo.',
    body: "Axessplayer è il registro dove le persone concedono in licenza il proprio volto, voce e segni per l'uso dell'IA — a brand, emittenti e laboratori. Verifica una volta. Imposta le tue condizioni. Guadagna a ogni utilizzo.",
    bullets: { free: 'Iscrizione gratuita', signup: 'Registrazione in 10 minuti', approve: 'Tu approvi ogni lavoro' },
    form: {
      name: 'Nome', namePlaceholder: 'Il tuo nome',
      contact: 'Contatto', contactPlaceholder: 'Email o telefono',
      location: 'Località', locationPlaceholder: 'Città, paese',
      languages: 'Lingue', languagesPlaceholder: 'Lingue parlate / segnate',
      about: 'Raccontaci di te', aboutPlaceholder: 'Recitazione, voce, lingua dei segni, modeling, conduzione…',
      submit: 'Licenzia il mio volto',
    },
  },
  ca: {
    eyebrow: 'Per a talent',
    title1: 'La IA necessita la teva cara.',
    title2: "Ara l'ha de pagar.",
    body: "Axessplayer és el registre on les persones llicencien la seva cara, veu i signes per a l'ús d'IA — a marques, emissores i laboratoris. Verifica una vegada. Posa les teves condicions. Cobra cada cop que s'utilitzi.",
    bullets: { free: 'Inscripció gratuïta', signup: 'Registre en 10 minuts', approve: 'Tu aproves cada feina' },
    form: {
      name: 'Nom', namePlaceholder: 'El teu nom',
      contact: 'Contacte', contactPlaceholder: 'Correu o telèfon',
      location: 'Ubicació', locationPlaceholder: 'Ciutat, país',
      languages: 'Idiomes', languagesPlaceholder: 'Idiomes que parles / signes',
      about: "Explica'ns sobre tu", aboutPlaceholder: 'Actuació, veu, llengua de signes, modelatge, presentació…',
      submit: 'Llicencia la meva cara',
    },
  },
  ja: {
    eyebrow: 'タレント向け',
    title1: 'AIはあなたの顔を必要としている。',
    title2: 'そして、その対価を払うべきだ。',
    body: 'Axessplayerは、ブランド・放送局・AIラボに対し、人々が自分の顔・声・手話をAI利用にライセンス提供できるレジストリです。一度認証。条件を設定。使われるたびに報酬を獲得。',
    bullets: { free: '参加無料', signup: '10分で登録', approve: '案件ごとに承認' },
    form: {
      name: '氏名', namePlaceholder: 'お名前',
      contact: '連絡先', contactPlaceholder: 'メールまたは電話',
      location: '所在地', locationPlaceholder: '都市、国',
      languages: '言語', languagesPlaceholder: '話す/手話する言語',
      about: '自己紹介', aboutPlaceholder: '演技、声、手話、モデル、司会など…',
      submit: '顔をライセンスする',
    },
  },
  tr: {
    eyebrow: 'Yetenekler için',
    title1: 'Yapay zekânın yüzüne ihtiyacı var.',
    title2: 'Artık bunun bedelini ödemeli.',
    body: 'Axessplayer; insanların yüzünü, sesini ve işaret dilini markalara, yayıncılara ve YZ laboratuvarlarına lisansladığı kayıt sistemidir. Bir kez doğrula. Şartlarını belirle. Her kullanımda kazan.',
    bullets: { free: 'Üyelik ücretsiz', signup: '10 dakikalık kayıt', approve: 'Her işi sen onaylarsın' },
    form: {
      name: 'Ad', namePlaceholder: 'Adınız',
      contact: 'İletişim', contactPlaceholder: 'E-posta veya telefon',
      location: 'Konum', locationPlaceholder: 'Şehir, ülke',
      languages: 'Diller', languagesPlaceholder: 'Konuştuğunuz / işaret dilleriniz',
      about: 'Kendinizden bahsedin', aboutPlaceholder: 'Oyunculuk, ses, işaret dili, modellik, sunuculuk…',
      submit: 'Yüzümü lisansla',
    },
  },
  ar: {
    eyebrow: 'للمواهب',
    title1: 'الذكاء الاصطناعي يحتاج وجهك.',
    title2: 'الآن عليه أن يدفع مقابله.',
    body: 'Axessplayer هو السجل الذي يرخّص فيه الأشخاص وجوههم وأصواتهم ولغة إشارتهم لاستخدامها في الذكاء الاصطناعي — للعلامات التجارية والمذيعين ومختبرات الذكاء الاصطناعي. تحقق مرة واحدة. حدد شروطك. اربح في كل استخدام.',
    bullets: { free: 'الانضمام مجاني', signup: 'تسجيل في 10 دقائق', approve: 'أنت توافق على كل عمل' },
    form: {
      name: 'الاسم', namePlaceholder: 'اسمك',
      contact: 'التواصل', contactPlaceholder: 'البريد الإلكتروني أو الهاتف',
      location: 'الموقع', locationPlaceholder: 'المدينة، البلد',
      languages: 'اللغات', languagesPlaceholder: 'اللغات التي تتحدثها / تشير بها',
      about: 'أخبرنا عن نفسك', aboutPlaceholder: 'تمثيل، صوت، لغة إشارة، عرض أزياء، تقديم…',
      submit: 'رخّص وجهي',
    },
  },
};

const root = path.resolve('src/i18n/locales');
for (const [lang, talent] of Object.entries(translations)) {
  const file = path.join(root, lang, 'common.json');
  const json = JSON.parse(fs.readFileSync(file, 'utf8'));
  json.home = json.home || {};
  json.home.talent = talent;
  fs.writeFileSync(file, JSON.stringify(json, null, 2) + '\n');
  console.log('updated', file);
}
