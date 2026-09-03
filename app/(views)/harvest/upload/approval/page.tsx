import type { Metadata } from 'next';
import HarvestUploadWrapper from './harvest-upload-approval-wrapper';

export const metadata: Metadata = { title: 'Approval Harvesting SPB' };

export default function Page() {
  return <HarvestUploadWrapper />;
}
