import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';
import { isAxiosError } from 'axios';
import { Icon } from '@/components/icon/Icon';
import { loginSchema } from './LoginSchema';
import type { LoginFormFormData } from './LoginSchema';
import { useAuth } from './AuthContext';
import type { AuthUser } from './AuthContext';
import { api } from '@/lib/api';
import { Label } from '@/components/ui/label';
import { InputWithIcon } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { BrandMark } from '@/components/BrandMark';
import { GoogleGlyph } from './GoogleGlyph';

// The API returns only { token }; the JWT payload carries the user claims
// (sub/email/role), so we derive the AuthUser from it.
function userFromToken(token: string): AuthUser {
  const payload = JSON.parse(atob(token.split('.')[1] ?? '')) as {
    sub: string;
    email: string;
    role: 'admin' | 'user';
  };
  return { id: payload.sub, email: payload.email, role: payload.role };
}

export default function LoginPage() {
  const { t } = useTranslation();
  const { login } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [rootError, setRootError] = useState<string | null>(null);
  const isLogin = mode === 'login';

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormFormData>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginFormFormData) => {
    setRootError(null);
    try {
      const res = await api.post(isLogin ? '/auth/login' : '/auth/register', data);
      const token: string = res.data.token;
      login(token, userFromToken(token));
      navigate('/dashboard');
    } catch (err) {
      const message =
        isAxiosError(err) && err.response?.data?.message
          ? (err.response.data.message as string)
          : t('Auth_error');
      setRootError(message);
    }
  };

  const toggleMode = () => {
    setMode(isLogin ? 'register' : 'login');
    setRootError(null);
  };

  return (
    <div className="flex min-h-screen w-full bg-background text-left text-foreground">
      {/* Left: form */}
      <div className="flex w-full flex-col px-6 py-8 sm:px-12 lg:w-[52%] lg:px-20">
        <div className="flex items-center gap-2.5">
          <BrandMark size={30} />
          <span className="text-[17px] font-semibold tracking-tight">finflow</span>
        </div>

        <div className="flex flex-1 items-center">
          <div className="mx-auto w-full max-w-95">
            <div className="mb-7">
              <h1 className="text-[26px] font-semibold tracking-tight">
                {t(isLogin ? 'Login_welcome' : 'Register_welcome')}
              </h1>
              <p className="mt-1.5 text-sm text-muted-foreground">
                {t(isLogin ? 'Login_subtitle' : 'Register_subtitle')}
              </p>
            </div>

            <form className="flex flex-col gap-4" onSubmit={handleSubmit(onSubmit)} noValidate>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="email">{t('Email')}</Label>
                <InputWithIcon
                  id="email"
                  type="email"
                  autoComplete="email"
                  placeholder={t('Email_placeholder')}
                  aria-invalid={!!errors.email}
                  icon={<Icon name="mail" size={18} />}
                  {...register('email')}
                />
                {errors.email && <p className="text-[12px] text-expense">{t(errors.email.message!)}</p>}
              </div>

              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">{t('Password')}</Label>
                  {isLogin && (
                    <button
                      type="button"
                      className="text-[12px] text-muted-foreground transition-colors hover:text-foreground"
                    >
                      {t('Forgot your password?')}
                    </button>
                  )}
                </div>
                <InputWithIcon
                  id="password"
                  type="password"
                  autoComplete={isLogin ? 'current-password' : 'new-password'}
                  placeholder="••••••••"
                  aria-invalid={!!errors.password}
                  icon={<Icon name="lock" size={18} />}
                  {...register('password')}
                />
                {errors.password && (
                  <p className="text-[12px] text-expense">{t(errors.password.message!)}</p>
                )}
              </div>

              {rootError && <p className="text-[13px] text-expense">{rootError}</p>}

              <Button type="submit" size="lg" className="mt-1 w-full" disabled={isSubmitting}>
                {t(isLogin ? 'Login' : 'Register_submit')}
              </Button>

              <div className="flex items-center gap-3 py-1">
                <Separator className="flex-1 bg-stone-300" />
                <span className="text-[11px] tracking-wide text-muted-foreground uppercase">
                  {t('or')}
                </span>
                <Separator className="flex-1 bg-stone-300" />
              </div>

              <Button type="button" variant="outline" size="lg" className="w-full border-stone-300">
                <GoogleGlyph /> {t('Continue with Google')}
              </Button>
            </form>

            <p className="mt-7 text-center text-sm text-muted-foreground">
              {t(isLogin ? "Don't have an account?" : 'Already have an account?')}{' '}
              <button
                type="button"
                onClick={toggleMode}
                className="font-medium text-foreground underline-offset-4 hover:underline"
              >
                {t(isLogin ? 'Sign up' : 'Sign in')}
              </button>
            </p>
          </div>
        </div>

        <p className="text-center text-[11px] text-muted-foreground lg:text-left">
          {t('Login_footer')}
        </p>
      </div>

      {/* Right: brand panel with forecast teaser (decorative, hardcoded) */}
      <div className="relative hidden overflow-hidden border-l border-border bg-muted/40 lg:flex lg:w-[48%]">
        <div
          className="absolute inset-0 opacity-[0.55]"
          style={{
            background:
              'radial-gradient(700px 400px at 78% 18%, color-mix(in oklch, rgb(var(--brand)) 22%, transparent), transparent 70%)',
          }}
        />
        <div className="relative z-10 flex w-full flex-col justify-center px-14">
          <span className="mb-5 inline-flex w-fit items-center rounded-full border border-border bg-background/60 px-2.5 text-[11px] font-medium backdrop-blur">
            <span className="rounded-full animate-pulse bg-green-600 size-3"></span><span className="size-1.5 rounded-full bg-brand" /> {t('Auth_badge')}
          </span>
          <h2 className="max-w-sm text-[28px] leading-tight font-semibold tracking-tight">
            {t('Auth_headline')}
          </h2>
          <p className="mt-3 max-w-sm text-[15px] text-muted-foreground">{t('Auth_subcopy')}</p>

          <div className="mt-8 max-w-sm rounded-xl border border-border bg-card/80 p-5 shadow-sm backdrop-blur">
            <p className="text-[12px] font-medium text-muted-foreground">{t('Auth_teaser_label')}</p>
            <p className="mt-1 font-mono text-[34px] font-semibold tracking-tight tabular-nums text-income">
              +1.498 €
            </p>
            <div className="mt-3 flex items-center gap-2">
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                <div className="h-full w-full rounded-full bg-income" />
              </div>
              <span className="shrink-0 text-[12px] font-medium text-income">
                {t('Auth_teaser_covered')}
              </span>
            </div>
            <p className="mt-3 text-[12px] text-muted-foreground">{t('Auth_teaser_detail')}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
