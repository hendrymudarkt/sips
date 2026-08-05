'use client';

import dynamic from 'next/dynamic';
import { PageLoading } from '@/app/components/ui/page-loading';

const UsersClient = dynamic(() => import('./users-client'), {
  loading: () => <PageLoading />,
});

export default function UsersWrapper() {
  return <UsersClient />;
}
