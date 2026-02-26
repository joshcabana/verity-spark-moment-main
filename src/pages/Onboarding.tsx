import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { User, Heart, Sparkles, ArrowRight, Check, Camera, Shield, Phone } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";
import SelfieCapture from "@/components/SelfieCapture";
import PhoneVerification from "@/components/PhoneVerification";
import { getPilotMetadata, trackEvent, trackPilotEvent } from "@/lib/analytics";

const genderOptions = [
  { value: "male", label: "Man" },
  { value: "female", label: "Woman" },
  { value: "non-binary", label: "Non-binary" },
  { value: "other", label: "Other" },
];

const seekingOptions = [
  { value: "male", label: "Men" },
  { value: "female", label: "Women" },
  { value: "everyone", label: "Everyone" },
];

const TOTAL_STEPS = 7; // 0-6

const Onboarding = () => {
  const [step, setStep] = useState(0);
  const [displayName, setDisplayName] = useState("");
  const [gender, setGender] = useState("");
  const [seeking, setSeeking] = useState("");
  const [selfieVerified, setSelfieVerified] = useState(false);
  const [phoneVerified, setPhoneVerified] = useState(false);
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();
  const pilotMetadata = getPilotMetadata(user?.user_metadata);

  const handleComplete = async () => {
    if (!user) return;
    setLoading(true);
    trackEvent("onboarding_completed", { withSelfie: selfieVerified });

    const updates: Record<string, string | boolean> = {
      display_name: displayName,
      gender,
      seeking_gender: seeking,
    };
    if (selfieVerified) {
      updates.verification_status = "verified";
    }

    const { error } = await supabase
      .from("profiles")
      .update(updates)
      .eq("user_id", user.id);

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      navigate("/lobby");
    }
    setLoading(false);
  };

  const steps = [
    // Step 0: Welcome
    <motion.div key="welcome" initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -50 }} className="text-center">
      <div className="w-20 h-20 rounded-2xl bg-gradient-gold flex items-center justify-center mx-auto mb-6 glow-gold">
        <Sparkles className="w-10 h-10 text-primary-foreground" />
      </div>
      <h2 className="font-display text-3xl font-bold text-foreground mb-3">Welcome to Verity</h2>
      <p className="text-muted-foreground mb-2">No profiles. No swiping. No bios upfront.</p>
      <p className="text-muted-foreground text-sm mb-8">Just 45 seconds of real connection — face to face.</p>
      <button
        onClick={() => {
          trackPilotEvent("onboarding_started", {
            ...pilotMetadata,
            entryPoint: "welcome_screen",
          });
          setStep(1);
        }}
        className="w-full bg-gradient-gold text-primary-foreground font-semibold py-4 rounded-full glow-gold flex items-center justify-center gap-2"
      >
        Let's Go <ArrowRight className="w-4 h-4" />
      </button>
    </motion.div>,

    // Step 1: Display Name
    <motion.div key="name" initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -50 }}>
      <User className="w-8 h-8 text-primary mb-4" />
      <h2 className="font-display text-2xl font-bold text-foreground mb-2">What should we call you?</h2>
      <p className="text-muted-foreground text-sm mb-6">This is only shared after a mutual match.</p>
      <input
        value={displayName}
        onChange={(e) => setDisplayName(e.target.value)}
        placeholder="Your first name"
        className="w-full bg-secondary border border-border rounded-xl px-4 py-3.5 text-foreground placeholder:text-muted-foreground/50 text-sm focus:outline-none focus:border-primary/50 mb-4"
      />
      <button
        onClick={() => displayName.trim() && setStep(2)}
        disabled={!displayName.trim()}
        className="w-full bg-gradient-gold text-primary-foreground font-semibold py-4 rounded-full glow-gold disabled:opacity-50 flex items-center justify-center gap-2"
      >
        Continue <ArrowRight className="w-4 h-4" />
      </button>
    </motion.div>,

    // Step 2: Gender
    <motion.div key="gender" initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -50 }}>
      <User className="w-8 h-8 text-primary mb-4" />
      <h2 className="font-display text-2xl font-bold text-foreground mb-2">I identify as</h2>
      <p className="text-muted-foreground text-sm mb-6">Used for matching only. Never shown publicly.</p>
      <div className="space-y-2 mb-6">
        {genderOptions.map((opt) => (
          <button
            key={opt.value}
            onClick={() => setGender(opt.value)}
            className={`w-full glass-card rounded-xl p-4 text-left transition-all flex items-center justify-between ${
              gender === opt.value ? "border-primary/50 glow-gold-sm" : ""
            }`}
          >
            <span className="text-sm text-foreground">{opt.label}</span>
            {gender === opt.value && <Check className="w-4 h-4 text-primary" />}
          </button>
        ))}
      </div>
      <button
        onClick={() => gender && setStep(3)}
        disabled={!gender}
        className="w-full bg-gradient-gold text-primary-foreground font-semibold py-4 rounded-full glow-gold disabled:opacity-50 flex items-center justify-center gap-2"
      >
        Continue <ArrowRight className="w-4 h-4" />
      </button>
    </motion.div>,

    // Step 3: Seeking
    <motion.div key="seeking" initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -50 }}>
      <Heart className="w-8 h-8 text-primary mb-4" />
      <h2 className="font-display text-2xl font-bold text-foreground mb-2">I'm interested in</h2>
      <p className="text-muted-foreground text-sm mb-6">We'll match you accordingly.</p>
      <div className="space-y-2 mb-6">
        {seekingOptions.map((opt) => (
          <button
            key={opt.value}
            onClick={() => setSeeking(opt.value)}
            className={`w-full glass-card rounded-xl p-4 text-left transition-all flex items-center justify-between ${
              seeking === opt.value ? "border-primary/50 glow-gold-sm" : ""
            }`}
          >
            <span className="text-sm text-foreground">{opt.label}</span>
            {seeking === opt.value && <Check className="w-4 h-4 text-primary" />}
          </button>
        ))}
      </div>
      <button
        onClick={() => seeking && setStep(4)}
        disabled={!seeking}
        className="w-full bg-gradient-gold text-primary-foreground font-semibold py-4 rounded-full glow-gold disabled:opacity-50 flex items-center justify-center gap-2"
      >
        Continue <ArrowRight className="w-4 h-4" />
      </button>
    </motion.div>,

    // Step 4: Selfie Verification
    <motion.div key="selfie" initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -50 }}>
      <div className="flex items-center gap-2 mb-4">
        <Shield className="w-8 h-8 text-primary" />
        <Camera className="w-6 h-6 text-primary" />
      </div>
      <h2 className="font-display text-2xl font-bold text-foreground mb-2">Verify You're Real</h2>
      <p className="text-muted-foreground text-sm mb-6">
        A quick AI liveness check keeps everyone safe. Your selfie is never shown to other users.
      </p>
      <SelfieCapture
        onVerified={() => {
          setSelfieVerified(true);
          setStep(5);
        }}
      />
      <button
        onClick={() => setStep(5)}
        className="w-full text-muted-foreground text-sm font-medium py-3 mt-4"
      >
        Skip for now
      </button>
    </motion.div>,

    // Step 5: Phone Verification (MANDATORY)
    <motion.div key="phone" initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -50 }}>
      <div className="flex items-center gap-2 mb-4">
        <Phone className="w-8 h-8 text-primary" />
        <Shield className="w-6 h-6 text-primary" />
      </div>
      <h2 className="font-display text-2xl font-bold text-foreground mb-2">Verify Your Phone</h2>
      <p className="text-muted-foreground text-sm mb-6">
        Australian mobile number required. This keeps our community safe and prevents fake accounts.
      </p>
      <PhoneVerification
        onVerified={() => {
          setPhoneVerified(true);
          setStep(6);
        }}
      />
    </motion.div>,

    // Step 6: Ready
    <motion.div key="ready" initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -50 }} className="text-center">
      <div className="w-20 h-20 rounded-2xl bg-gradient-gold flex items-center justify-center mx-auto mb-6 glow-gold">
        {selfieVerified ? (
          <Check className="w-10 h-10 text-primary-foreground" />
        ) : (
          <Sparkles className="w-10 h-10 text-primary-foreground" />
        )}
      </div>
      <h2 className="font-display text-3xl font-bold text-foreground mb-3">
        {selfieVerified ? "You're Verified!" : "You're Almost Ready!"}
      </h2>
      <p className="text-muted-foreground mb-2">
        {selfieVerified
          ? "Your identity is confirmed. You're ready to meet someone real."
          : "Complete selfie verification anytime from your profile for a trust badge."}
      </p>

      <div className="flex flex-col items-center gap-2 mb-6 mt-4">
        <div className="flex items-center gap-1.5">
          <Phone className="w-4 h-4 text-verity-success" />
          <span className="text-xs text-verity-success font-medium">Phone Verified ✓</span>
        </div>
        {selfieVerified && (
          <div className="flex items-center gap-1.5">
            <Shield className="w-4 h-4 text-verity-success" />
            <span className="text-xs text-verity-success font-medium">Identity Verified ✓</span>
          </div>
        )}
      </div>

      <button
        onClick={handleComplete}
        disabled={loading}
        className="w-full bg-gradient-gold text-primary-foreground font-semibold py-4 rounded-full glow-gold disabled:opacity-50 flex items-center justify-center gap-2 mt-4"
      >
        {loading ? "Saving..." : "Start Meeting People"} <Sparkles className="w-4 h-4" />
      </button>
    </motion.div>,
  ];

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-6">
      <div className="max-w-sm w-full">
        {/* Progress dots */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {Array.from({ length: TOTAL_STEPS }, (_, i) => (
            <div
              key={i}
              className={`h-1.5 rounded-full transition-all ${
                i <= step ? "w-6 bg-primary" : "w-3 bg-secondary"
              }`}
            />
          ))}
        </div>

        <AnimatePresence mode="wait">{steps[step]}</AnimatePresence>
      </div>
    </div>
  );
};

export default Onboarding;
