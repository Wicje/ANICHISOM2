import { OSProvider } from '@/lib/os-context';
import { Desktop } from '@/components/desktop';

export default function Home() {
  return (
    <OSProvider>
      <Desktop />
    </OSProvider>
  );
}
