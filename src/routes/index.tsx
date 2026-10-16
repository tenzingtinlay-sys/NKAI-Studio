import { createFileRoute } from "@tanstack/react-router";
import { AvatarLandingPage } from "@/components/studio/avatar-landing";

export const Route = createFileRoute("/")({
  component: AvatarLandingPage,
});
