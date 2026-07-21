import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { useTranslation } from 'react-i18next';
import { api } from '@/lib/api';
import { useAuth } from './AuthContext';
import { userFromToken } from './token';
import { Label } from '@/components/ui/label';
import { InputWithIcon } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/icon/Icon';
import { BrandMark } from '@/components/BrandMark';

type Status = 'verifying' | 'success' | 'error';

export default function VerifyEmailPage() {
  const { t } = useTranslation();
  const { login } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  // A link with no token can't be verified at all — start on the error state.
  const [status, setStatus] = useState<Status>(token ? 'verifying' : 'error');
  const [email, setEmail] = useState('');
  const [resendNotice, setResendNotice] = useState<string | null>(null);
  // The token is single use, so React 18's double-invoked effect in dev would
  // burn it and report a failure on the second call.
  const attempted = useRef(false);

  useEffect(() => {
    if (attempted.current || !token) return;
    attempted.current = true;

    void (async () => {
      try {
        const res = await api.post('/auth/verify-email', { token });
        const jwt: string = res.data.token;
        login(jwt, userFromToken(jwt));
        setStatus('success');
        // Give the success message a beat before dropping into the app.
        setTimeout(() => navigate('/dashboard'), 1500);
      } catch {
        setStatus('error');
      }
    })();
  }, [token, login, navigate]);

  const resend = async () => {
    setResendNotice(null);
    try {
      await api.post('/auth/resend-verification', { email });
    } catch {
      // Always answered generically by the API; keep the UI on one message.
    }
    setResendNotice(t('Auth_verification_resent'));
  };

  return (
    <div className="flex min-h-screen w-full flex-col bg-background px-6 py-8 text-foreground sm:px-12">
      <div className="flex items-center gap-2.5">
        <BrandMark size={30} />
        <span className="text-[17px] font-semibold tracking-tight">finflow</span>
      </div>

      <div className="flex flex-1 items-center">
        <div className="mx-auto w-full max-w-95">
          {status === 'verifying' && (
            <h1 className="text-[26px] font-semibold tracking-tight">{t('Verify_in_progress')}</h1>
          )}

          {status === 'success' && (
            <>
              <h1 className="text-[26px] font-semibold tracking-tight">{t('Verify_success')}</h1>
              <p className="mt-1.5 text-sm text-muted-foreground">{t('Verify_success_detail')}</p>
            </>
          )}

          {status === 'error' && (
            <>
              <h1 className="text-[26px] font-semibold tracking-tight">{t('Verify_failed')}</h1>
              <p className="mt-1.5 text-sm text-muted-foreground">{t('Verify_failed_detail')}</p>

              <div className="mt-6 flex flex-col gap-1.5">
                <Label htmlFor="email">{t('Email')}</Label>
                <InputWithIcon
                  id="email"
                  type="email"
                  autoComplete="email"
                  placeholder={t('Email_placeholder')}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  icon={<Icon name="mail" size={18} />}
                />
              </div>

              {resendNotice && <p className="mt-3 text-[13px] text-income">{resendNotice}</p>}

              <Button
                type="button"
                size="lg"
                className="mt-4 w-full"
                disabled={email.length === 0}
                onClick={() => void resend()}
              >
                {t('Verify_resend')}
              </Button>

              <p className="mt-7 text-center text-sm text-muted-foreground">
                <button
                  type="button"
                  onClick={() => navigate('/login')}
                  className="font-medium text-foreground underline-offset-4 hover:underline"
                >
                  {t('Verify_back_to_login')}
                </button>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
