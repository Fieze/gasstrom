import { useTranslation } from 'react-i18next';
import { Globe } from 'lucide-react';

export function LanguageSwitcher() {
    const { i18n } = useTranslation();

    const toggleLanguage = () => {
        const newLang = i18n.resolvedLanguage === 'de' ? 'en' : 'de';
        i18n.changeLanguage(newLang);
    };

    return (
        <button
            onClick={toggleLanguage}
            className="p-2 rounded-full hover:bg-white/10 transition-colors text-muted hover:text-foreground flex items-center gap-2"
            title={i18n.resolvedLanguage === 'de' ? 'Switch to English' : 'Auf Deutsch wechseln'}
        >
            <Globe size={20} />
            <span className="text-sm font-medium uppercase">{i18n.resolvedLanguage}</span>
        </button>
    );
}
