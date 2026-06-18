import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowRight } from 'lucide-react';

export const CreatorsForm: React.FC = () => {
  const { t } = useTranslation();
  const [type, setType] = useState('novela');

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    const name = String(fd.get('name') || '');
    const contact = String(fd.get('contact') || '');
    const contentType = String(fd.get('contentType') || '');
    const project = String(fd.get('project') || '');

    const subject = encodeURIComponent(`[Creators] ${name} - ${contentType}`);
    const body = encodeURIComponent(
      `Name: ${name}\nContact: ${contact}\nType of Content: ${contentType}\n\nProject:\n${project}\n`
    );
    window.location.href = `mailto:malena@axessible.ai?subject=${subject}&body=${body}`;
  };

  const typeKeys = ['novela', 'reality', 'cooking', 'education', 'animated', 'others'] as const;

  const inputCls =
    'w-full h-12 px-4 rounded-2xl border border-axp-ink/15 bg-white text-axp-ink placeholder:text-axp-ink/40 focus:outline-none focus:ring-2 focus:ring-axp-rose font-body';

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-2xl mx-auto grid gap-4">
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor="cf-name" className="sr-only">{t('home.creators.form.name')}</label>
          <input id="cf-name" name="name" required maxLength={100} placeholder={t('home.creators.form.namePlaceholder')} className={inputCls} />
        </div>
        <div>
          <label htmlFor="cf-contact" className="sr-only">{t('home.creators.form.contact')}</label>
          <input id="cf-contact" name="contact" required maxLength={200} placeholder={t('home.creators.form.contactPlaceholder')} className={inputCls} />
        </div>
      </div>

      <div>
        <label htmlFor="cf-type" className="sr-only">{t('home.creators.form.contentType')}</label>
        <select
          id="cf-type"
          name="contentType"
          value={type}
          onChange={(e) => setType(e.target.value)}
          className={inputCls}
        >
          {typeKeys.map((k) => (
            <option key={k} value={t(`home.creators.form.types.${k}`)}>
              {t(`home.creators.form.types.${k}`)}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="cf-project" className="sr-only">{t('home.creators.form.project')}</label>
        <textarea
          id="cf-project"
          name="project"
          required
          maxLength={2000}
          rows={5}
          placeholder={t('home.creators.form.projectPlaceholder')}
          className={`${inputCls} h-auto py-3 min-h-32`}
        />
      </div>

      <button
        type="submit"
        className="inline-flex items-center justify-center gap-2 h-14 px-7 rounded-full bg-axp-rose text-white font-body font-medium hover:bg-axp-rose/90 transition-colors"
      >
        {t('home.creators.form.submit')}
        <ArrowRight className="w-4 h-4" />
      </button>
    </form>
  );
};
