import type { Metadata } from 'next';
import HarvestUploadWrapper from './harvest-upload-open-wrapper';

export const metadata: Metadata = { title: 'Open Harvesting SPB' };

export default function Page() {
  return <HarvestUploadWrapper />;
}
