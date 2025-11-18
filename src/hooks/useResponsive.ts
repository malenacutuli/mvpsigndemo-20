import { useEffect, useState } from 'react';

export type DeviceType = 'desktop' | 'ipad' | 'mobile';

export function useResponsive() {
  const [deviceType, setDeviceType] = useState<DeviceType>('desktop');

  useEffect(() => {
    const checkDevice = () => {
      const width = window.innerWidth;
      if (width >= 1024) {
        setDeviceType('desktop');
      } else if (width >= 768) {
        setDeviceType('ipad');
      } else {
        setDeviceType('mobile');
      }
    };

    checkDevice();
    window.addEventListener('resize', checkDevice);
    return () => window.removeEventListener('resize', checkDevice);
  }, []);

  return {
    isDesktop: deviceType === 'desktop',
    isIPad: deviceType === 'ipad',
    isMobile: deviceType === 'mobile',
    deviceType
  };
}
