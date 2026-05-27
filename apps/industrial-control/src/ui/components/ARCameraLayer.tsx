import { ReactNode } from 'react';
import { JarvisAR } from './JarvisAR';

interface Props {
  isActive: boolean;
  children?: ReactNode;
}

export function ARCameraLayer({ isActive, children }: Props) {
  if (!isActive) return <>{children}</>;

  return (
    <div className="absolute inset-0 z-30 pointer-events-none overflow-hidden rounded-2xl">
      <JarvisAR />
      {/* Any other overlays can securely be added here in the future */}
      {children}
    </div>
  );
}
