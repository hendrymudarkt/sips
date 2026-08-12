'use client';

import { useSearchParams } from 'next/navigation';

export default function CekDoketClient() {
  const searchParams = useSearchParams();

  const params = new URLSearchParams();
  const dateFrom = searchParams.get('dateFrom') || '';
  const dateTo = searchParams.get('dateTo') || '';
  const nodokumen = searchParams.get('nodokumen') || '';
  if (dateFrom) params.set('dateFrom', dateFrom);
  if (dateTo) params.set('dateTo', dateTo);
  if (nodokumen) params.set('nodokumen', nodokumen);

  const src = `/gis/${params.toString() ? `?${params.toString()}` : ''}`;

  return (
    <div className="h-[calc(100vh-64px)] w-full">
      <iframe
        src={src}
        title="Cek Doket"
        className="h-full w-full border-0"
        allow="geolocation; camera; microphone"
        allowFullScreen
      />
    </div>
  );
}
