import { useCallback, useEffect, useState } from 'react';
import { Moon, Sun } from 'lucide-react';
import ConvertView from './components/ConvertView';
import GibView from './components/GibView';
import { applyTheme, getInitialTheme, type Theme } from './lib/theme';
import type { GibQueryInput } from './lib/gib';

type Tab = 'convert' | 'gib';

export default function App() {
  const [tab, setTab] = useState<Tab>('convert');
  const [gibPrefill, setGibPrefill] = useState<GibQueryInput | null>(null);
  const [count, setCount] = useState<{ files: number; docs: number }>({ files: 0, docs: 0 });
  const onCount = useCallback((files: number, docs: number) => setCount({ files, docs }), []);
  const [theme, setTheme] = useState<Theme>(() => getInitialTheme());

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  const openInGib = (input: GibQueryInput) => {
    setGibPrefill(input);
    setTab('gib');
  };

  return (
    <div className="min-h-screen font-body text-ink">
      <header className="sticky top-0 z-30 border-b border-rule bg-paper/95 backdrop-blur-[2px]">
        <div className="mx-auto flex h-14 max-w-[1600px] items-center gap-10 px-6 lg:px-10">
          <span className="token font-medium text-ink">ZarfPDF</span>
          <nav className="flex h-full items-stretch gap-8" aria-label="Ana gezinti">
            <TabLink active={tab === 'convert'} onClick={() => setTab('convert')}>
              PDF Dönüştür
            </TabLink>
            <TabLink active={tab === 'gib'} onClick={() => setTab('gib')}>
              GİB Doğrula
            </TabLink>
          </nav>
          <span className="token ml-auto text-muted" aria-live="polite">
            {count.docs ? `${count.files} dosya · ${count.docs} belge` : 'Belge yok'}
          </span>
          <button
            type="button"
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className="token inline-flex h-8 items-center gap-2 text-muted transition-colors duration-micro hover:text-ink"
            aria-label={theme === 'dark' ? 'Açık temaya geç' : 'Koyu temaya geç'}
          >
            {theme === 'dark' ? <Sun size={14} strokeWidth={1.5} /> : <Moon size={14} strokeWidth={1.5} />}
            {theme === 'dark' ? 'Açık' : 'Koyu'}
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-[1600px] px-6 pb-16 pt-10 lg:px-10">
        <div hidden={tab !== 'convert'}>
          <ConvertView onOpenInGib={openInGib} onCount={onCount} />
        </div>
        <div hidden={tab !== 'gib'}>
          <GibView prefill={gibPrefill} />
        </div>
      </main>
    </div>
  );
}

function TabLink(props: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={props.onClick}
      aria-current={props.active ? 'page' : undefined}
      className={`token -mb-px inline-flex items-center border-b transition-colors duration-micro ${
        props.active ? 'border-ink text-ink' : 'border-transparent text-muted hover:text-ink'
      }`}
    >
      {props.children}
    </button>
  );
}
