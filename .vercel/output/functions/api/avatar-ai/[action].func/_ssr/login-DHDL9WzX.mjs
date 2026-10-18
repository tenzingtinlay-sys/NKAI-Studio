import { __exportAll, __toESM } from "../_runtime.mjs";
import { Link, require_jsx_runtime, require_react, useNavigate } from "../_libs/@tanstack/react-router+[...].mjs";
import { ArrowLeft, ShieldCheck, Sparkles } from "../_libs/lucide-react.mjs";
import "./router-BmUNAukh.mjs";
import { AuthNavActions, useCurrentUserState } from "./auth-nav-actions-Dut7RsEr.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/login-DHDL9WzX.js
var login_DHDL9WzX_exports = /* @__PURE__ */ __exportAll({ component: () => LoginPage });
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
function LoginPage() {
	const { user, isPending } = useCurrentUserState();
	useNavigate();
	const [busyProvider, setBusyProvider] = (0, import_react.useState)(null);
	const [error, setError] = (0, import_react.useState)("");
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("main", {
		className: "nkai-login-page",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("header", {
				className: "nkai-login-nav",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Link, {
					className: "nkai-library-brand",
					to: "/",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "nkai-library-mark",
						children: "N"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: ["NKAI ", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("b", { children: "STUDIO" })] })]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "nkai-login-nav-actions",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(AuthNavActions, {}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Link, {
						className: "nkai-login-back",
						to: "/",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ArrowLeft, { size: 15 }), " Back to studio"]
					})]
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
				className: "nkai-login-card",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "nkai-login-symbol",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Sparkles, { size: 23 })
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "nkai-eyebrow",
						children: "YOUR PERSONAL AI WORKSPACE"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", { children: "Connect to NKAI Studio" }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "nkai-login-subtitle",
						children: "Sign in to connect your account and continue to your avatar workspace."
					}),
					isPending ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "nkai-login-state",
						role: "status",
						children: "Checking your session…"
					}) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "nkai-login-config",
						role: "status",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: "Sign-in is not enabled in this deployment yet." }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: "The login screen is ready, but real accounts require authentication to be enabled and an OAuth provider configured on the server. No demo sign-in is offered." })]
					}),
					error && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "nkai-login-error",
						role: "alert",
						children: error
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "nkai-login-security",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ShieldCheck, { size: 15 }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Authentication is handled by the NKAI server. Provider secrets are not placed in browser code." })]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "nkai-login-footnote",
						children: "By continuing, you’ll return to the NKAI Studio workspace after authentication."
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("footer", {
				className: "nkai-login-footer",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
					to: "/avatar-library",
					children: "Explore avatar library"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "NKAI STUDIO · ACCOUNT ACCESS" })]
			})
		]
	});
}
//#endregion
export { LoginPage as component, login_DHDL9WzX_exports };
