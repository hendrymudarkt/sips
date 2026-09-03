'use client';

import dynamic from 'next/dynamic';
import { SkeletonTable } from '@/app/components/ui/skeletons';

const HarvestingUploadPage = dynamic(() => import('./harvest-upload-approval-client'), {
  
  loading: () => (
    <div className="p-6">
      <SkeletonTable rows={10} />
    </div>
  ),
});

export default function HarvestUploadWrapper() {
  return <HarvestingUploadPage />;
}

