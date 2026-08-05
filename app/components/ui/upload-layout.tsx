import type { ReactNode } from 'react';

interface UploadLayoutProps {
  children?: ReactNode;
  maxWidth?: string;
}

export function UploadLayout({ children, maxWidth = 'max-w-7xl' }: UploadLayoutProps) {
  return (
    <div className="min-h-screen bg-base-100 p-6">
      <div className={`${maxWidth} mx-auto`}>
        {children}
      </div>
    </div>
  );
}
