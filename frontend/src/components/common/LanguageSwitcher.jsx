import { Languages } from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext.jsx';
import { LANGUAGES } from '../../i18n/dictionary.js';

// Small language picker for the top bars. English is the default; the choice is remembered on this device.
export default function LanguageSwitcher() {
  const { lang, setLang, t } = useLanguage();
  return (
    <label className="relative inline-flex items-center" title={t('Language')}>
      <Languages className="pointer-events-none absolute left-2 h-4 w-4 text-slate-500" />
      <select aria-label={t('Language')} value={lang} onChange={(e) => setLang(e.target.value)} className="h-9 cursor-pointer appearance-none rounded-xl border border-transparent bg-transparent py-0 pl-8 pr-2 text-sm text-slate-600 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500">
        {LANGUAGES.map((l) => <option key={l.code} value={l.code}>{l.label}</option>)}
      </select>
    </label>
  );
}
