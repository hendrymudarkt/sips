import type { Metadata } from 'next';
import HarvestUploadWrapper from './harvest-upload-wrapper';

export const metadata: Metadata = { title: 'Harvesting SPB' };

export default function Page() {
  return <HarvestUploadWrapper />;
}
