"use client";

import { useActionState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { createClientAction, type ClientActionState } from "@/app/(app)/clients/actions";
import { Button } from "@/components/ui/button";
import { Input, Textarea, Field } from "@/components/ui/input";

export default function NewClientPage() {
  const [state, formAction, pending] = useActionState<ClientActionState, FormData>(
    createClientAction,
    undefined,
  );

  return (
    <div className="px-8 py-10 max-w-2xl">
      <Link
        href="/clients"
        className="inline-flex items-center gap-1.5 text-xs font-mono uppercase tracking-wider text-ink-400 hover:text-coral mb-8 transition-colors"
      >
        <ArrowLeft size={12} />
        Back to clients
      </Link>

      <header className="mb-10">
        <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-coral mb-2">⊹ New brand</div>
        <h1 className="font-display text-5xl tracking-tightest leading-tight">
          Add a <span className="font-display-italic text-coral">client</span>.
        </h1>
        <p className="text-ink-300 mt-3">
          Capture the essentials. You can always refine the brand profile later — this just
          gets you to a working brief faster.
        </p>
      </header>

      <form action={formAction} className="space-y-6">
        <Field label="Brand name" htmlFor="name">
          <Input id="name" name="name" required placeholder="Halcyon Coffee Co." />
        </Field>

        <Field label="Industry" htmlFor="industry" hint="One word is plenty.">
          <Input id="industry" name="industry" placeholder="Specialty F&B" />
        </Field>

        <Field
          label="Brand voice"
          htmlFor="brand_voice"
          hint="A handful of adjectives or a one-liner. Used to steer AI captions."
        >
          <Textarea
            id="brand_voice"
            name="brand_voice"
            placeholder="warm, considered, slightly poetic — never corporate"
            rows={2}
          />
        </Field>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <Field
            label="Brand colors"
            htmlFor="brand_colors"
            hint="Hex codes, comma-separated."
          >
            <Input id="brand_colors" name="brand_colors" placeholder="#0A0908, #FF6B35, #F5F1E8" />
          </Field>
          <Field
            label="Brand keywords"
            htmlFor="brand_keywords"
            hint="Comma-separated. Steers hashtags."
          >
            <Input id="brand_keywords" name="brand_keywords" placeholder="craft, slow-coffee, wabi-sabi" />
          </Field>
        </div>

        <Field label="Logo URL" htmlFor="logo_url" hint="Optional. Public URL to a square logo.">
          <Input id="logo_url" name="logo_url" type="url" placeholder="https://..." />
        </Field>

        <Field label="Internal notes" htmlFor="notes" hint="What should the team know?">
          <Textarea id="notes" name="notes" rows={3} placeholder="Strategy, deliverables, contacts..." />
        </Field>

        {state?.error && (
          <div className="text-sm text-red-400 border border-red-900/50 bg-red-950/30 rounded-md px-4 py-3">
            {state.error}
          </div>
        )}

        <div className="flex items-center gap-3 pt-4">
          <Button type="submit" disabled={pending} size="lg">
            {pending ? "Creating..." : "Create client"}
          </Button>
          <Link href="/clients">
            <Button variant="ghost" size="lg" type="button">
              Cancel
            </Button>
          </Link>
        </div>
      </form>
    </div>
  );
}
