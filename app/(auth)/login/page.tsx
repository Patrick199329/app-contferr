import { LoginForm } from '@/components/login-form';

export default function LoginPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-8 p-8">
      <div className="flex items-center gap-2">
        <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-accent text-lg font-bold text-accent-foreground">
          C
        </span>
        <span className="text-xl font-semibold">Contferr</span>
      </div>
      <div className="app-card w-full max-w-sm p-8">
        <LoginForm />
      </div>
    </main>
  );
}
