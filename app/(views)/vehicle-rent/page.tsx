import type { Metadata } from 'next';
import VehicleRentWrapper from './vehicle-rent-wrapper';

export async function generateMetadata(): Promise<Metadata> {
  return { title: 'Vehicle Rent' };
}

export default function Page() {
  return <VehicleRentWrapper />;
}