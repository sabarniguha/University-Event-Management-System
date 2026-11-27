import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { DICTIONARY } from './dictionary.js';

const LanguageContext = createContext({ lang: 'en', setLang: () => {}, t: (s) => s });
const KEY = 'unievents.lang';

const read = () => { try { const v = localStorage.getItem(KEY); return v === 'hi' || v === 'bn' ? v : 'en'; } catch { return 'en'; } };

export function LanguageProvider({ children }) {
  const [lang, setLangState] = useState(read);
  useEffect(() => { document.documentElement.lang = lang; }, [lang]);
  const setLang = useCallback((l) => { setLangState(l); try { localStorage.setItem(KEY, l); } catch { /* private mode: keep it for this visit only */ } }, []);

  // Exact text is looked up first; "Welcome back, Asha" style lines use the {name} template.
  const t = useCallback((text) => {
    if (lang === 'en' || typeof text !== 'string') return text;
    const dict = DICTIONARY[lang] || {};
    if (dict[text]) return dict[text];
    const m = text.match(/^Welcome back, (.+)$/);
    if (m && dict['Welcome back, {name}']) return dict['Welcome back, {name}'].replace('{name}', m[1]);
    return text;
  }, [lang]);

  const value = useMemo(() => ({ lang, setLang, t }), [lang, setLang, t]);
  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export const useLanguage = () => useContext(LanguageContext);
