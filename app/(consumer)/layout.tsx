import { ConsumerLayoutClient } from './layout-client';

export default function ConsumerLayout({ children }: { children: React.ReactNode }) {
  return <ConsumerLayoutClient>{children}</ConsumerLayoutClient>;
}
