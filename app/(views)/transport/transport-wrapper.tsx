'use client';

import dynamic from 'next/dynamic';
import { PageLoading } from '@/app/components/ui/page-loading';

const PengangkutanPage = dynamic(() => import('./transport-client'), {
  loading: () => <PageLoading titleWidth="w-44" />,
});

export default function PengangkutanWrapper() {
  return <PengangkutanPage />;
}
