import { useTranslation } from 'react-i18next';
import bscAi from '@/assets/partners/bsc-ai-factory.png.asset.json';
import antiestatico from '@/assets/partners/antiestatico.jpg.asset.json';
import nvidia from '@/assets/partners/nvidia-inception.png.asset.json';
import nonstop from '@/assets/partners/nonstop.png.asset.json';
import story from '@/assets/partners/story.png.asset.json';

const partners = [
  { src: nvidia.url, alt: 'NVIDIA Inception Program' },
  { src: bscAi.url, alt: 'BSC AI Factory' },
  { src: story.url, alt: 'Story' },
  { src: nonstop.url, alt: 'Non Stop', bgDark: true },
  { src: antiestatico.url, alt: 'Antiestatico' },
];

export const PartnersStripe = () => {
  const { t } = useTranslation();
  const items = [...partners, ...partners];

  return (
    <section className="bg-white border-y border-axp-line py-10">
      <p className="text-center text-xs uppercase tracking-[0.2em] text-muted-foreground font-light mb-6">
        {t('partners.title', 'Our partners')}
      </p>
      <div className="relative overflow-hidden">
        <div className="flex animate-scroll w-max">
          {items.map((p, i) => (
            <div
              key={i}
              className={`flex-shrink-0 mx-10 flex items-center justify-center h-16 ${
                p.bgDark ? 'bg-axp-ink rounded-md px-4' : ''
              }`}
            >
              <img
                src={p.src}
                alt={p.alt}
                className="max-h-16 w-auto object-contain grayscale opacity-70 hover:grayscale-0 hover:opacity-100 transition-all duration-300"
                loading="lazy"
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
