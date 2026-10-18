import { createFileRoute } from "@tanstack/react-router";
import { LifeMatePage } from "@/components/studio/lifemate-page";

export const Route = createFileRoute("/")({
  component: LifeMatePage,
});
