import { Link } from "@tanstack/react-router";
import { LogIn } from "lucide-react";
import { UserButton } from "@/lib/auth/gates";
import { useCurrentUserState } from "@/lib/auth/use-current-user";

/** Shared account slot for the primary navigation. */
export function AuthNavActions() {
  const { user, isPending } = useCurrentUserState();
  if (isPending) {
    return <span className="nkai-auth-skeleton" aria-label="Checking account" />;
  }
  if (!user) {
    return <Link className="nkai-auth-link" to="/login"><LogIn size={15} /> Sign in</Link>;
  }
  return <div className="nkai-auth-user"><UserButton /></div>;
}
