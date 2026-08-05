'use client';

import dynamic from 'next/dynamic';
import { PageLoading } from '@/app/components/ui/page-loading';

const AttendanceClient = dynamic(() => import('./attendance-client'), {
  loading: () => <PageLoading titleWidth="w-48" />,
});

export default function AttendanceWrapper() {
  return <AttendanceClient />;
}
