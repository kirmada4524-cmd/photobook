import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft, BookOpen } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuthStore } from "@/lib/auth";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Login - Yaara" },
      { name: "description", content: "Sign in to Yaara to create your photobooks." },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const router = useRouter();
  const { login } = useAuthStore();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsLoading(true);

    try {
      const success = login(username, password);
      if (success) {
        toast.success("Welcome back!");
        await router.navigate({ to: "/home" });
      } else {
        toast.error("Invalid username or password");
        setPassword("");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="flex min-h-[100dvh] items-center justify-center bg-[#fffdf8] px-4 py-8">
      <div className="w-full max-w-md">
        <Link
          to="/"
          className="mb-5 inline-flex h-10 items-center gap-2 text-sm font-semibold text-muted-foreground transition hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Yaara
        </Link>

        <section className="border border-border bg-white p-6 shadow-[0_16px_40px_rgba(31,27,24,.09)] sm:p-8">
          <div className="mb-7 flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-md bg-primary">
              <BookOpen className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <p className="font-display text-xl font-bold">Yaara</p>
              <p className="text-xs text-muted-foreground">Custom Photobook Studio</p>
            </div>
          </div>

          <div className="mb-6">
            <h1 className="text-2xl font-semibold">Sign in</h1>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">
              Continue your saved books or open the admin workspace.
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label htmlFor="login-username" className="mb-2 block text-sm font-medium">
                Username
              </label>
              <Input
                id="login-username"
                type="text"
                placeholder="Enter your username"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                disabled={isLoading}
                autoComplete="username"
              />
            </div>

            <div>
              <label htmlFor="login-password" className="mb-2 block text-sm font-medium">
                Password
              </label>
              <Input
                id="login-password"
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                disabled={isLoading}
                autoComplete="current-password"
              />
            </div>

            <Button
              type="submit"
              className="h-11 w-full"
              disabled={isLoading || !username || !password}
            >
              {isLoading ? "Signing in..." : "Sign in"}
            </Button>
          </form>

          {import.meta.env.DEV && (
            <div className="mt-6 border-t pt-5 text-xs leading-5 text-muted-foreground">
              <p className="font-semibold text-foreground">Local demo access</p>
              <p>User: user1 / userpass</p>
              <p>Admin: admin / adminpass</p>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
