import { createFileRoute, redirect } from "@tanstack/react-router";
import { AdminPanel } from "@/components/admin/AdminPanel";
import { useAuthStore } from "@/lib/auth";

export const Route = createFileRoute("/admin")({
  beforeLoad: () => {
    const { isAdmin } = useAuthStore.getState();
    if (!isAdmin) {
      throw redirect({ to: "/" });
    }
  },
  component: AdminPanel,
});
