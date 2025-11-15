import adidasLogo from '@/assets/logos/adidas.png';
import cocaColaLogo from '@/assets/logos/coca-cola.png';
import disneyLogo from '@/assets/logos/disney.png';
import mangoLogo from '@/assets/logos/mango.png';
import appleLogo from '@/assets/logos/apple.png';
import diageoLogo from '@/assets/logos/diageo.png';

const logos = [
  { src: disneyLogo, alt: 'Disney' },
  { src: cocaColaLogo, alt: 'Coca-Cola' },
  { src: mangoLogo, alt: 'Mango' },
  { src: adidasLogo, alt: 'Adidas' },
  { src: appleLogo, alt: 'Apple' },
  { src: diageoLogo, alt: 'Diageo' },
];

export const MovingLogoStripe = () => {
  return (
    <div className="relative overflow-hidden py-8">
      <div className="flex animate-scroll">
        {/* First set of logos */}
        {logos.map((logo, index) => (
          <div
            key={`logo-1-${index}`}
            className="flex-shrink-0 mx-8 grayscale opacity-60 hover:grayscale-0 hover:opacity-100 transition-all duration-300"
          >
            <img
              src={logo.src}
              alt={logo.alt}
              className="h-12 w-auto object-contain"
            />
          </div>
        ))}
        {/* Duplicate set for seamless loop */}
        {logos.map((logo, index) => (
          <div
            key={`logo-2-${index}`}
            className="flex-shrink-0 mx-8 grayscale opacity-60 hover:grayscale-0 hover:opacity-100 transition-all duration-300"
          >
            <img
              src={logo.src}
              alt={logo.alt}
              className="h-12 w-auto object-contain"
            />
          </div>
        ))}
      </div>
    </div>
  );
};
