import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, ArrowRight, ShieldCheck, Sparkles } from "lucide-react";
import { authEnabled, GROK_PROVIDERS, signIn } from "@/lib/auth/client";
import { useCurrentUserState } from "@/lib/auth/use-current-user";

export const Route = createFileRoute("/login")({ component: LoginPage });

function LoginPage() {
  const { user, isPending } = useCurrentUserState();
  const navigate = useNavigate();
  const [busyProvider, setBusyProvider] = useState<string | null>(null);
  const [error, setError] = useState("");

  async function connect(providerId: string) {
    setError("");
    setBusyProvider(providerId);
    try {
      await signIn(providerId, { callbackURL: "/" });
      // OAuth normally navigates away; if a provider flow resolves in place,
      // take the user to the studio after the session is established.
      await navigate({ to: "/" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign-in could not be started. Please try again.");
    } finally {
      setBusyProvider(null);
    }
  }

  return (
    <main className="nkai-login-page">
      <header className="nkai-login-nav">
        <Link className="nkai-library-brand" to="/"><span className="nkai-library-mark">N</span><span>NKAI <b>STUDIO</b></span></Link>
        <Link className="nkai-login-back" to="/"><ArrowLeft size={15} /> Back to studio</Link>
      </header>
      <section className="nkai-login-card">
        <div className="nkai-login-symbol"><Sparkles size={23} /></div>
        <p className="nkai-eyebrow">YOUR PERSONAL AI WORKSPACE</p>
        <h1>Connect to NKAI Studio</h1>
        <p className="nkai-login-subtitle">Sign in to connect your account and continue to your avatar workspace.</p>
        {isPending ? (
          <div className="nkai-login-state" role="status">Checking your session…</div>
        ) : user ? (
          <div className="nkai-login-state">
            <ShieldCheck size={20} />
            <div><strong>You’re connected</strong><span>{user.displayName || user.primaryEmail || "Your account"} is signed in.</span></div>
            <button className="nkai-login-primary" onClick={() => void navigate({ to: "/" })}>Continue to studio <ArrowRight size={16} /></button>
          </div>
        ) : authEnabled ? (
          <div className="nkai-login-providers">
            {GROK_PROVIDERS.map((provider) => (
              <button className="nkai-login-provider" key={provider.providerId} type="button" disabled={busyProvider !== null} onClick={() => void connect(provider.providerId)}>
                <span className="nkai-provider-letter">{provider.label === "Google" ? "G" : "𝕏"}</span>
                <span>{busyProvider === provider.providerId ? "Connecting…" : "Continue with " + provider.label}</span>
                <ArrowRight size={16} />
              </button>
            ))}
          </div>
        ) : (
          <div className="nkai-login-config" role="status">
            <strong>Sign-in is not enabled in this deployment yet.</strong>
            <p>The login screen is ready, but real accounts require authentication to be enabled and an OAuth provider configured on the server. No demo sign-in is offered.</p>
          </div>
        )}
        {error && <p className="nkai-login-error" role="alert">{error}</p>}
        <div className="nkai-login-security"><ShieldCheck size={15} /><span>Authentication is handled by the NKAI server. Provider secrets are not placed in browser code.</span></div>
        <p className="nkai-login-footnote">By continuing, you’ll return to the NKAI Studio workspace after authentication.</p>
      </section>
      <footer className="nkai-login-footer"><Link to="/avatar-library">Explore avatar library</Link><span>NKAI STUDIO · ACCOUNT ACCESS</span></footer>
    </main>
  );
}
