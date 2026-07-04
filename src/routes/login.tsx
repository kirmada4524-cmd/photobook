import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { BookOpen } from "lucide-react";
import { useAuthStore } from "@/lib/auth";
import { toast } from "sonner";

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

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
      <div className="w-full max-w-md">
        {/* Card */}
        <div className="bg-white rounded-lg shadow-lg p-8">
          {/* Logo */}
          <div className="flex items-center justify-center gap-3 mb-8">
            <div className="flex items-center justify-center h-12 w-12 rounded-lg bg-accent">
              <BookOpen className="h-6 w-6 text-accent-foreground" />
            </div>
            <div>
              <h1 className="font-display text-2xl font-bold">Yaara</h1>
              <p className="text-xs text-muted-foreground">Custom Photobook Studio</p>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <label className="block text-sm font-medium mb-2">Username</label>
              <Input
                type="text"
                placeholder="user1"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                disabled={isLoading}
                autoComplete="username"
              />
              <p className="text-xs text-muted-foreground mt-1">Demo: user1 or admin</p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Password</label>
              <Input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
                autoComplete="current-password"
              />
              <p className="text-xs text-muted-foreground mt-1">
                user1: userpass, admin: adminpass
              </p>
            </div>

            <Button type="submit" className="w-full" disabled={isLoading || !username || !password}>
              {isLoading ? "Signing in..." : "Sign In"}
            </Button>
          </form>

          {/* Divider */}
          <div className="my-6 relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white px-2 text-muted-foreground">Demo Accounts</span>
            </div>
          </div>

          {/* Demo Info */}
          <div className="space-y-3 text-sm">
            <div className="p-3 rounded-lg bg-blue-50 border border-blue-200">
              <p className="font-medium text-blue-900">User Account</p>
              <p className="text-blue-700">Username: user1</p>
              <p className="text-blue-700">Password: userpass</p>
            </div>
            <div className="p-3 rounded-lg bg-purple-50 border border-purple-200">
              <p className="font-medium text-purple-900">Admin Account</p>
              <p className="text-purple-700">Username: admin</p>
              <p className="text-purple-700">Password: adminpass</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
