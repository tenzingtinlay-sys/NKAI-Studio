import { Link } from "@tanstack/react-router";
import { LogIn } from "lucide-react";
import { UserButton } from "@/lib/auth/gates";
import { authEnabled } from "@/lib/auth/client";
import { useCurrentUserState } from "@/lib/auth/use-current-user";

/** Shared account slot for the primary navigation. */
export function AuthNavActions() {
  const { user, isPending } = useCurrentUserState();
  if (isPending) {
    return <span className="nkai-auth-skeleton" aria-label="Checking account" />;
  }
  if (!authEnabled || !user) {
    return <Link className="nkai-auth-link" to={"/login" as any}><LogIn size={15} /> Sign in</Link>;
  }
  return <div className="nkai-auth-user"><UserButton /></div>;
}
