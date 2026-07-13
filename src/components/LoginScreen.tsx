import { useState } from 'react';
import { LockKeyhole, LogIn } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { apiRequest } from '../api/client';

interface LoginScreenProps {
    onAuthenticated: () => void;
}
export function LoginScreen({ onAuthenticated }: LoginScreenProps) {
    const { t } = useTranslation();
    const [token, setToken] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const submit = async (event: React.FormEvent) => {
        event.preventDefault();
        setIsSubmitting(true);
        setError(null);
        try {
            await apiRequest('/api/auth/login', {
                method: 'POST',
                body: JSON.stringify({ token })
            });
            setToken('');
            onAuthenticated();
        } catch (requestError) {
            setError(requestError instanceof Error ? requestError.message : t('auth.loginFailed'));
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <main className="min-h-screen flex items-center justify-center p-4">
            <form onSubmit={submit} className="card w-full max-w-md space-y-5">
                <div className="flex items-center gap-3">
                    <LockKeyhole size={28} className="text-primary" />
                    <div><h1 className="text-xl font-bold">{t('auth.title')}</h1><p className="text-sm text-muted">{t('auth.description')}</p></div>
                </div>
                {error && <div role="alert" className="p-3 rounded bg-red-500/10 border border-red-500/30 text-red-300 text-sm">{error}</div>}
                <label className="block text-sm font-medium text-muted">
                    {t('auth.accessToken')}
                    <input type="password" autoComplete="current-password" required value={token} onChange={event => setToken(event.target.value)} className="mt-2 w-full bg-black/20 border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-primary/50" />
                </label>
                <button type="submit" disabled={isSubmitting} className="w-full bg-primary hover:bg-primary-hover disabled:opacity-50 text-white py-3 rounded-lg flex items-center justify-center gap-2">
                    <LogIn size={18} />{isSubmitting ? t('common.loading') : t('auth.login')}
                </button>
            </form>
        </main>
    );
}
