"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { loginAction, signupAction, type AuthState } from "@/app/auth/actions";
import { Button } from "@/components/ui/button";
import { Input, Field } from "@/components/ui/input";

export default function LoginPage() {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const action = mode === "login" ? loginAction : signupAction;
  const [state, formAction, pending] = useActionState<AuthState, FormData>(action, undefined);

  return (
    <div className="min-h-screen grid lg:grid-cols-[1.1fr_1fr]">
      {/* Left — editorial hero */}
      <aside className="hidden lg:flex relative overflow-hidden bg-ink-800 border-r border-ink-700">
        <div className="absolute inset-0 opacity-30"
             style={{ background: "radial-gradient(ellipse at 30% 20%, #FF6B35 0%, transparent 60%)" }} />
        <div className="absolute top-0 right-0 w-[500px] h-[500px] opacity-20"
             style={{ background: "radial-gradient(circle, #7A8B6F 0%, transparent 70%)" }} />

        <div className="relative z-10 flex flex-col justify-between p-12 w-full">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-md bg-coral flex items-center justify-center">
              <span className="font-display text-xl text-ink font-bold">A</span>
            </div>
            <span className="font-mono text-xs uppercase tracking-[0.25em] text-ink-300">
              Atelier · Agency OS
            </span>
          </div>

          <div className="space-y-6 max-w-lg">
            <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-coral">
              ⊹ Issue No. 01
            </div>
            <h1 className="font-display text-6xl xl:text-7xl text-ink-50 tracking-tightest leading-[0.95]">
              The control room for{" "}
              <span className="font-display-italic text-coral">modern</span>{" "}
              creative shops.
            </h1>
            <p className="text-ink-300 text-lg leading-relaxed max-w-md">
              Manage every brand from one place. Generate. Approve. Schedule.
              Publish to Instagram and TikTok — without ever leaving the panel.
            </p>
          </div>

          <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-ink-400 flex gap-6">
            <span>·  Multi-tenant</span>
            <span>·  AI-native</span>
            <span>·  Ship-ready</span>
          </div>
        </div>
      </aside>

      {/* Right — form */}
      <main className="flex items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-sm space-y-8 animate-fade-up">
          <div className="space-y-2">
            <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-ink-400">
              {mode === "login" ? "Returning · Sign in" : "New · Create account"}
            </div>
            <h2 className="font-display text-4xl tracking-tight">
              {mode === "login" ? (
                <>Welcome <span className="font-display-italic text-coral">back</span></>
              ) : (
                <>Start your <span className="font-display-italic text-coral">atelier</span></>
              )}
            </h2>
          </div>

          <form action={formAction} className="space-y-5">
            {mode === "signup" && (
              <Field label="Agency name" htmlFor="agencyName">
                <Input id="agencyName" name="agencyName" placeholder="Studio Halcyon" required />
              </Field>
            )}
            <Field label="Email" htmlFor="email">
              <Input id="email" name="email" type="email" autoComplete="email" required />
            </Field>
            <Field label="Password" htmlFor="password">
              <Input
                id="password"
                name="password"
                type="password"
                autoComplete={mode === "login" ? "current-password" : "new-password"}
                minLength={6}
                required
              />
            </Field>

            {state?.error && (
              <div className="text-xs text-red-400 border border-red-900/50 bg-red-950/30 rounded-md px-3 py-2">
                {state.error}
              </div>
            )}

            <Button type="submit" disabled={pending} className="w-full" size="lg">
              {pending ? "..." : mode === "login" ? "Sign in" : "Create account"}
            </Button>
          </form>

          <div className="text-sm text-ink-300">
            {mode === "login" ? (
              <>
                Don&rsquo;t have an account?{" "}
                <button
                  className="text-coral hover:text-coral-300 underline-offset-4 hover:underline"
                  onClick={() => setMode("signup")}
                >
                  Create one
                </button>
              </>
            ) : (
              <>
                Already have an account?{" "}
                <button
                  className="text-coral hover:text-coral-300 underline-offset-4 hover:underline"
                  onClick={() => setMode("login")}
                >
                  Sign in
                </button>
              </>
            )}
          </div>

          <div className="text-xs text-ink-400 leading-relaxed">
            By continuing, you agree to use this for legitimate marketing work
            on behalf of your clients. <Link href="/" className="underline">Home</Link>
          </div>
        </div>
      </main>
    </div>
  );
}
