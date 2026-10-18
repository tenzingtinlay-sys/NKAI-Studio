import { createFileRoute, redirect } from "@tanstack/react-router";

// The imported MediaForge workspace is retired. Keep the old URL safe by
// redirecting visitors to the current NKAI Studio live-conversation page.
export const Route = createFileRoute("/studio")({
  beforeLoad: () => {
    throw redirect({ to: "/" });
  },
});
