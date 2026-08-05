'use client';

import dynamic from 'next/dynamic';
import { PageLoading } from '@/app/components/ui/page-loading';

const HarvestPage = dynamic(() => import('./harvest-client'), {
  loading: () => <PageLoading titleWidth="w-48" />,
});

export default function HarvestWrapper() {
  return <HarvestPage />;
}
