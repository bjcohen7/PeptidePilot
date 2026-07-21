import { useState, useCallback } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AlertTriangle, Mail, ArrowRight, Home } from "lucide-react";
import { trpc } from "@/lib/trpc";

export default function ContraindicationOffRamp() {
  const [, navigate] = useLocation();
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const { mutate: submitOffRamp, isPending: sending } = trpc.quiz.submitOffRampEmail.useMutation({
    onSuccess: () => {
      if (typeof window !== "undefined" && "fbq" in window) {
        try {
          (window as any).fbq("trackCustom", "OffRampSignup", {
            content_name: "Contraindication Off-Ramp",
            content_category: "off-ramp",
          });
        } catch {}
      }
      setSubmitted(true);
    },
    onError: () => {
      setSubmitted(true);
    },
  });

  const handleSubmit = useCallback(() => {
    if (!email.trim() || sending) return;
    submitOffRamp({ email: email.trim().toLowerCase() });
  }, [email, sending, submitOffRamp]);

  return (
    <div className="w-full max-w-lg mx-auto text-center">
      {!submitted ? (
        <>
          <div className="mx-auto w-14 h-14 rounded-full bg-amber-50 flex items-center justify-center mb-6">
            <AlertTriangle className="w-7 h-7 text-amber-500" />
          </div>

          <h2
            className="text-2xl sm:text-3xl font-normal text-foreground mb-4 leading-snug"
            style={{ fontFamily: "serif" }}
          >
            A couple of things we want to flag
          </h2>

          <p className="text-sm sm:text-base text-muted-foreground leading-relaxed mb-6">
            Based on what you&apos;ve shared, GLP-1 medications may not be
            the right fit for you right now. Pregnancy and certain thyroid
            conditions are important contraindications, and we want to make
            sure you&apos;re getting the right guidance.
          </p>

          <div className="rounded-xl border border-border/60 bg-muted/30 p-5 mb-6 text-left text-sm text-muted-foreground leading-relaxed space-y-3">
            <p>
              <strong className="text-foreground">What this means:</strong>{" "}
              Clinical guidelines recommend against GLP-1 therapy in these
              situations. This isn&apos;t a judgment — it&apos;s how responsible
              medicine works.
            </p>
            <p>
              <strong className="text-foreground">What to do next:</strong>{" "}
              If you&apos;re working with a doctor, bring this up at your next
              visit. If you&apos;d like us to follow up with resources or
              alternative options, drop your email below.
            </p>
          </div>

          <div className="space-y-3">
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                type="email"
                placeholder="Your email (optional)"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="pl-10 h-12 text-base"
              />
            </div>
            <Button
              onClick={handleSubmit}
              disabled={sending}
              className="w-full gap-2 h-12"
            >
              {sending ? "Sending..." : "Send me resources"}
              <ArrowRight className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              onClick={() => navigate("/")}
              className="w-full gap-2 text-muted-foreground"
            >
              <Home className="w-4 h-4" />
              Back to home
            </Button>
          </div>
        </>
      ) : (
        <>
          <div className="mx-auto w-14 h-14 rounded-full bg-green-50 flex items-center justify-center mb-6">
            <Mail className="w-7 h-7 text-green-500" />
          </div>

          <h2
            className="text-2xl sm:text-3xl font-normal text-foreground mb-4 leading-snug"
            style={{ fontFamily: "serif" }}
          >
            You&apos;re all set
          </h2>

          <p className="text-sm sm:text-base text-muted-foreground leading-relaxed mb-8">
            We&apos;ll send resources and alternative options to your inbox.
            In the meantime, we recommend speaking with your primary care
            provider about your situation.
          </p>

          <Button
            onClick={() => navigate("/")}
            className="gap-2"
          >
            <Home className="w-4 h-4" />
            Back to home
          </Button>
        </>
      )}
    </div>
  );
}
