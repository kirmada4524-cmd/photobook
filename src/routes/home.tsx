import { createFileRoute, redirect } from "@tanstack/react-router";

// The main landing page is at / — redirect here for backward compatibility
export const Route = createFileRoute("/home")({
  beforeLoad: () => {
    throw redirect({ to: "/", replace: true });
  },
  component: () => null,
});
