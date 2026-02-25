import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { Sparkles, Mail, Lock, Eye, EyeOff } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { trackEvent } from "@/lib/analytics";

const Auth = () => {
  const [searchParams] = useSearchParams();
  const defaultIsLogin = searchParams.get("mode") !== "signup";

  const [isLogin, setIsLogin] = useState(defaultIsLogin);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { signIn, signUp } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    trackEvent("auth_view", { mode: isLogin ? "signin" : "signup" });
  }, [isLogin]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    trackEvent("auth_submit_attempt", {
      mode: isLogin ? "signin" : "signup",
      email_domain: email.includes("@") ? email.split("@")[1] : "unknown",
    });

    if (isLogin) {
      const { error } = await signIn(email, password);
      if (error) {
        trackEvent("auth_submit_failed", { mode: "signin", reason: error.message });
        toast({ title: "Error", description: error.message, variant: "destructive" });
      } else {
        trackEvent("auth_submit_success", { mode: "signin" });

        // Check if profile is complete; skip onboarding for returning users
        const { data: profile } = await supabase
          .from("profiles")
          .select("display_name, gender, seeking_gender")
          .eq("user_id", (await supabase.auth.getUser()).data.user?.id ?? "")
          .single();

        const nextRoute = profile?.display_name && profile?.gender && profile?.seeking_gender ? "/lobby" : "/onboarding";
        trackEvent("auth_post_signin_route", { next_route: nextRoute });
        navigate(nextRoute);
      }
    } else {
      const { error } = await signUp(email, password);
      if (error) {
        trackEvent("auth_submit_failed", { mode: "signup", reason: error.message });
        toast({ title: "Error", description: error.message, variant: "destructive" });
      } else {
        trackEvent("auth_submit_success", { mode: "signup", verification: "email_link_sent" });
        toast({ title: "Check your email", description: "We sent you a verification link." });
      }
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-sm w-full"
      >
        <div className="text-center mb-10">
          <div className="w-16 h-16 rounded-2xl bg-gradient-gold flex items-center justify-center mx-auto mb-4 glow-gold">
            <Sparkles className="w-8 h-8 text-primary-foreground" />
          </div>
          <h1 className="font-display text-4xl font-bold text-gradient-gold mb-2">Verity</h1>
          <p className="text-muted-foreground text-sm">Real faces. Real feelings. 45 seconds.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative">
            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email"
              required
              className="w-full bg-secondary border border-border rounded-xl pl-11 pr-4 py-3.5 text-foreground placeholder:text-muted-foreground/50 text-sm focus:outline-none focus:border-primary/50"
            />
          </div>

          <div className="relative">
            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              required
              minLength={6}
              className="w-full bg-secondary border border-border rounded-xl pl-11 pr-11 py-3.5 text-foreground placeholder:text-muted-foreground/50 text-sm focus:outline-none focus:border-primary/50"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground"
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-gold text-primary-foreground font-semibold py-4 rounded-full glow-gold disabled:opacity-50"
          >
            {loading ? "..." : isLogin ? "Sign In" : "Create Account"}
          </button>
        </form>

        <p className="text-center text-sm text-muted-foreground mt-6">
          {isLogin ? "Don't have an account?" : "Already have an account?"}{" "}
          <button
            onClick={() => {
              const nextMode = isLogin ? "signup" : "signin";
              trackEvent("auth_mode_toggled", { next_mode: nextMode });
              setIsLogin(!isLogin);
            }}
            className="text-primary font-medium hover:underline"
          >
            {isLogin ? "Sign up" : "Sign in"}
          </button>
        </p>
      </motion.div>
    </div>
  );
};

export default Auth;
