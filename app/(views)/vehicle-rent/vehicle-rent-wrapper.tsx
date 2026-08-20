'use client';

import dynamic from 'next/dynamic';
import { PageLoading } from '@/app/components/ui/page-loading';

const VehicleRentPage = dynamic(() => import('./vehicle-rent-client'), {
  loading: () => <PageLoading titleWidth="w-44" />,
});

export default function VehicleRentWrapper() {
  return <VehicleRentPage />;
}