import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle, Loader2, ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";

interface PhoneVerificationProps {
  onVerified: () => void;
  onSkip?: () => void;
}

const getErrorMessage = (error: unknown) => {
  if (error instanceof Error) return error.message;
  return "Unexpected error";
};

const PhoneVerification = ({ onVerified }: PhoneVerificationProps) => {
  const [step, setStep] = useState<"input" | "otp" | "verified">("input");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const { user } = useAuth();

  // Build full E.164 number
  const fullPhone = phoneNumber.startsWith("0")
    ? `+61${phoneNumber.slice(1)}`
    : phoneNumber.startsWith("+61")
    ? phoneNumber
    : `+61${phoneNumber}`;

  const isValidAuMobile = /^\+614\d{8}$/.test(fullPhone);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => setCooldown((c) => c - 1), 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  const handleSendOtp = async () => {
    if (!isValidAuMobile) {
      toast({ title: "Invalid number", description: "Enter a valid Australian mobile (04XX XXX XXX).", variant: "destructive" });
      return;
    }
    setSending(true);
    try {
      const { error } = await supabase.auth.signInWithOtp({ phone: fullPhone });
      if (error) throw error;
      setStep("otp");
      setCooldown(60);
      toast({ title: "Code sent!", description: `SMS sent to ${fullPhone}` });
    } catch (error) {
      toast({ title: "Error", description: getErrorMessage(error), variant: "destructive" });
    } finally {
      setSending(false);
    }
  };

  const handleOtpChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;
    const newOtp = [...otp];
    newOtp[index] = value.slice(-1);
    setOtp(newOtp);

    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    if (newOtp.every((d) => d !== "") && newOtp.join("").length === 6) {
      handleVerifyOtp(newOtp.join(""));
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleVerifyOtp = async (code?: string) => {
    const otpCode = code || otp.join("");
    if (otpCode.length !== 6) return;
    setVerifying(true);
    try {
      const { error } = await supabase.auth.verifyOtp({
        phone: fullPhone,
        token: otpCode,
        type: "sms",
      });
      if (error) throw error;

      // Mark phone as verified in profile + store hash in secure table
      if (user) {
        // Hash the phone number for storage (SHA-256)
        const encoder = new TextEncoder();
        const data = encoder.encode(fullPhone);
        const hashBuffer = await crypto.subtle.digest("SHA-256", data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const phoneHash = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");

        // Update profile verified_phone flag
        await supabase
          .from("profiles")
          .update({ verified_phone: true })
          .eq("user_id", user.id);

        // Store hashed phone in secure table
        await supabase
          .from("user_phone_verifications")
          .upsert({
            user_id: user.id,
            phone_hash: phoneHash,
            verified_at: new Date().toISOString(),
          });
      }

      setStep("verified");
      setTimeout(() => onVerified(), 1200);
    } catch (error) {
      toast({ title: "Incorrect code", description: getErrorMessage(error), variant: "destructive" });
      setOtp(["", "", "", "", "", ""]);
      inputRefs.current[0]?.focus();
    } finally {
      setVerifying(false);
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (pasted.length === 6) {
      setOtp(pasted.split(""));
      handleVerifyOtp(pasted);
    }
  };

  return (
    <div className="w-full">
      <AnimatePresence mode="wait">
        {step === "input" && (
          <motion.div key="input" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-xl bg-secondary flex items-center justify-center text-lg">🇦🇺</div>
              <div className="flex-1">
                <div className="flex items-center gap-1">
                  <span className="text-sm text-muted-foreground font-medium">+61</span>
                  <input
                    type="tel"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value.replace(/[^\d]/g, ""))}
                    placeholder="4XX XXX XXX"
                    maxLength={10}
                    className="flex-1 bg-transparent text-foreground text-sm font-medium placeholder:text-muted-foreground/50 focus:outline-none"
                    autoFocus
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">Australian mobile numbers only</p>
              </div>
            </div>
            <button
              onClick={handleSendOtp}
              disabled={!isValidAuMobile || sending}
              className="w-full bg-gradient-gold text-primary-foreground font-semibold py-4 rounded-full glow-gold disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
              {sending ? "Sending..." : "Send Verification Code"}
            </button>
          </motion.div>
        )}

        {step === "otp" && (
          <motion.div key="otp" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <p className="text-sm text-muted-foreground mb-4 text-center">
              Enter the 6-digit code sent to your phone
            </p>
            <div className="flex justify-center gap-2 mb-6" onPaste={handlePaste}>
              {otp.map((digit, i) => (
                <input
                  key={i}
                  ref={(el) => { inputRefs.current[i] = el; }}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleOtpChange(i, e.target.value)}
                  onKeyDown={(e) => handleOtpKeyDown(i, e)}
                  className="w-11 h-14 text-center text-xl font-bold bg-secondary border border-border rounded-xl text-foreground focus:outline-none focus:border-primary/50 transition-colors"
                  autoFocus={i === 0}
                />
              ))}
            </div>
            {verifying && (
              <div className="flex items-center justify-center gap-2 mb-4">
                <Loader2 className="w-4 h-4 animate-spin text-primary" />
                <span className="text-sm text-muted-foreground">Verifying...</span>
              </div>
            )}
            <div className="flex items-center justify-between text-sm">
              <button
                onClick={() => { setStep("input"); setOtp(["", "", "", "", "", ""]); }}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                Change number
              </button>
              <button
                onClick={handleSendOtp}
                disabled={cooldown > 0 || sending}
                className="text-primary font-medium disabled:text-muted-foreground disabled:cursor-not-allowed"
              >
                {cooldown > 0 ? `Resend in ${cooldown}s` : "Resend code"}
              </button>
            </div>
          </motion.div>
        )}

        {step === "verified" && (
          <motion.div key="verified" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-4">
            <CheckCircle className="w-16 h-16 text-verity-success mx-auto mb-3" />
            <p className="text-foreground font-medium">Phone Verified!</p>
            <p className="text-sm text-muted-foreground mt-1">Australian mobile confirmed</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default PhoneVerification;
