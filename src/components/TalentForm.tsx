import React from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowRight } from 'lucide-react';

export const TalentForm: React.FC = () => {
  const { t } = useTranslation();

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    const name = String(fd.get('name') || '');
    const contact = String(fd.get('contact') || '');
    const location = String(fd.get('location') || '');
    const languages = String(fd.get('languages') || '');
    const about = String(fd.get('about') || '');

    const subject = encodeURIComponent(`[Talent] ${name}`);
    const body = encodeURIComponent(
      `Name: ${name}\nContact: ${contact}\nLocation: ${location}\nLanguages: ${languages}\n\nAbout:\n${about}\n`
    );
    window.location.href = `mailto:malena@axessible.ai?subject=${subject}&body=${body}`;
  };

  const inputCls =
    'w-full h-12 px-4 rounded-2xl border border-axp-ink/15 bg-white text-axp-ink placeholder:text-axp-ink/40 focus:outline-none focus:ring-2 focus:ring-axp-rose font-body';

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-2xl mx-auto grid gap-4">
      <div className="grid sm:grid-cols-2 gap-4">
        <input name="name" required maxLength={100} placeholder={t('home.talent.form.namePlaceholder')} className={inputCls} aria-label={t('home.talent.form.name')} />
        <input name="contact" required maxLength={200} placeholder={t('home.talent.form.contactPlaceholder')} className={inputCls} aria-label={t('home.talent.form.contact')} />
      </div>
      <div className="grid sm:grid-cols-2 gap-4">
        <input name="location" maxLength={100} placeholder={t('home.talent.form.locationPlaceholder')} className={inputCls} aria-label={t('home.talent.form.location')} />
        <input name="languages" maxLength={200} placeholder={t('home.talent.form.languagesPlaceholder')} className={inputCls} aria-label={t('home.talent.form.languages')} />
      </div>
      <textarea
        name="about"
        required
        maxLength={2000}
        rows={5}
        placeholder={t('home.talent.form.aboutPlaceholder')}
        className={`${inputCls} h-auto py-3 min-h-32`}
        aria-label={t('home.talent.form.about')}
      />

      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-axp-ink/65 font-body">
        <span className="inline-flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-axp-rose" />{t('home.talent.bullets.free')}</span>
        <span className="inline-flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-axp-rose" />{t('home.talent.bullets.signup')}</span>
        <span className="inline-flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-axp-rose" />{t('home.talent.bullets.approve')}</span>
      </div>

      <button
        type="submit"
        className="inline-flex items-center justify-center gap-2 h-14 px-7 rounded-full bg-axp-rose text-white font-body font-medium hover:bg-axp-rose/90 transition-colors"
      >
        {t('home.talent.form.submit')}
        <ArrowRight className="w-4 h-4" />
      </button>
    </form>
  );
};
