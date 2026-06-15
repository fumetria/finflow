import { useForm } from 'react-hook-form';
import { loginSchema } from './LoginSchema';
import type { LoginFormFormData } from './LoginSchema';
import { useTranslation } from 'react-i18next';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { zodResolver } from '@hookform/resolvers/zod';
import { api } from '@/lib/api';
import { useAuth } from './AuthContext';
import { useNavigate } from 'react-router';

//https://react-hook-form.com/docs/useform/register
export default function LoginPage() {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(loginSchema),
  });

  const { login } = useAuth();
  const navigate = useNavigate();

  const onSubmit = async (data: LoginFormFormData) => {
    const res = await api.post('/auth/login', data);
    login(res.data.token, res.data.user);
    navigate('/dashboard');
  };

  const { t } = useTranslation();
  return (
    <>
      <section>
        <Card>
          <form action="" onSubmit={handleSubmit(onSubmit)}>
            <div>
              <Label htmlFor="email">{t('Email')}</Label>
              <Input type="email" id="email" {...register('email')} placeholder={t('Your email')} />
              {errors.email && <p>{errors.email.message}</p>}
            </div>
            <div>
              <Label htmlFor="email">{t('Password')}</Label>
              <Input type="password" id="password" {...register('password')} />
              {errors.password && <p>{errors.password.message}</p>}
            </div>
            <Button type="submit">{t('Login')}</Button>
          </form>
        </Card>
      </section>
    </>
  );
}
