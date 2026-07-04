import { useState } from "react";
import { useAuthStore } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LogIn, LogOut, Shield, User } from "lucide-react";

interface LoginModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function LoginModal({ open, onOpenChange }: LoginModalProps) {
  const { currentUser: user, login, logout, isAdmin } = useAuthStore();
  const [userId, setUserId] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");

  const clearError = () => setLoginError("");

  const handleLogin = () => {
    const ok = login(userId, password);
    if (ok) {
      setUserId("");
      setPassword("");
      onOpenChange(false);
    } else {
      setLoginError("Invalid username or password");
    }
  };

  const handleLogout = () => {
    logout();
    onOpenChange(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleLogin();
  };

  if (user) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {isAdmin ? (
                <Shield className="h-5 w-5 text-amber-500" />
              ) : (
                <User className="h-5 w-5 text-blue-500" />
              )}
              Signed In
            </DialogTitle>
            <DialogDescription>
              You are signed in as <strong>{user.username}</strong>{" "}
              {isAdmin && (
                <span className="text-amber-600 font-semibold">(Admin)</span>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-3 pt-2">
            <Button variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>
              Close
            </Button>
            <Button
              variant="destructive"
              className="flex-1 gap-2"
              onClick={handleLogout}
            >
              <LogOut className="h-4 w-4" />
              Sign Out
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); clearError(); }}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <LogIn className="h-5 w-5" />
            Sign In to Yaara
          </DialogTitle>
          <DialogDescription>
            Enter your credentials to access your account.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <Label htmlFor="login-userid">User ID</Label>
            <Input
              id="login-userid"
              placeholder="Enter your user ID"
              value={userId}
              onChange={(e) => { setUserId(e.target.value); clearError(); }}
              onKeyDown={handleKeyDown}
              autoComplete="username"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="login-password">Password</Label>
            <Input
              id="login-password"
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => { setPassword(e.target.value); clearError(); }}
              onKeyDown={handleKeyDown}
              autoComplete="current-password"
            />
          </div>
          {loginError && (
            <p className="text-sm text-destructive font-medium">{loginError}</p>
          )}
          <Button
            className="w-full gap-2"
            onClick={handleLogin}
            disabled={!userId.trim() || !password.trim()}
          >
            <LogIn className="h-4 w-4" />
            Sign In
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
