import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Check, LogOut, Shield, Camera, Phone, Upload, FileCheck, Loader2 } from "lucide-react";
import SelfieCapture from "@/components/SelfieCapture";
import PhoneVerification from "@/components/PhoneVerification";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";
import AppNav from "@/components/AppNav";

const emojiOptions = ["👤", "😊", "🔥", "💜", "🌟", "🦋", "🎯", "🌙", "🎨", "💎", "🌸", "🐾"];

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

const Profile = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [gender, setGender] = useState("");
  const [seekingGender, setSeekingGender] = useState("");
  const [avatarEmoji, setAvatarEmoji] = useState("👤");
  const [verificationStatus, setVerificationStatus] = useState("unverified");
  const [showSelfieCapture, setShowSelfieCapture] = useState(false);
  const [phoneVerified, setPhoneVerified] = useState(false);
  const [showPhoneVerification, setShowPhoneVerification] = useState(false);
  const [governmentIdStatus, setGovernmentIdStatus] = useState("none");
  const [uploadingId, setUploadingId] = useState(false);
  const idInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const { data } = await supabase
        .from("profiles")
        .select("display_name, bio, gender, seeking_gender, avatar_emoji, verification_status, verified_phone, government_id_status")
        .eq("user_id", user.id)
        .single();
      if (data) {
        setDisplayName(data.display_name || "");
        setBio(data.bio || "");
        setGender(data.gender || "");
        setSeekingGender(data.seeking_gender || "");
        setAvatarEmoji(data.avatar_emoji || "👤");
        setVerificationStatus(data.verification_status || "unverified");
        setPhoneVerified(data.verified_phone ?? false);
        setGovernmentIdStatus(data.government_id_status || "none");
      }
      setLoading(false);
    };
    load();
  }, [user]);

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({
        display_name: displayName,
        bio,
        gender,
        seeking_gender: seekingGender,
        avatar_emoji: avatarEmoji,
      })
      .eq("user_id", user.id);

    if (error) {
      toast({ title: "Error saving", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Profile saved ✓" });
    }
    setSaving(false);
  };

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background px-6 pt-8 pb-24">
      <div className="max-w-lg mx-auto">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-3 mb-8">
          <button onClick={() => navigate(-1)} className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center">
            <ArrowLeft className="w-5 h-5 text-foreground" />
          </button>
          <div>
            <h1 className="font-display text-2xl font-bold text-gradient-gold">Profile</h1>
            <p className="text-muted-foreground text-xs">{user?.email}</p>
          </div>
        </motion.div>

        {/* Avatar Emoji */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.05 }} className="mb-6">
          <label className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-3 block">Avatar</label>
          <div className="flex flex-wrap gap-2">
            {emojiOptions.map((emoji) => (
              <button
                key={emoji}
                onClick={() => setAvatarEmoji(emoji)}
                className={`w-12 h-12 rounded-xl text-2xl flex items-center justify-center transition-all ${
                  avatarEmoji === emoji ? "bg-primary/20 border border-primary/50 glow-gold-sm" : "bg-secondary border border-border"
                }`}
              >
                {emoji}
              </button>
            ))}
          </div>
        </motion.div>

        {/* Display Name */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }} className="mb-5">
          <label className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-2 block">Display Name</label>
          <input
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="Your first name"
            className="w-full bg-secondary border border-border rounded-xl px-4 py-3 text-foreground placeholder:text-muted-foreground/50 text-sm focus:outline-none focus:border-primary/50"
          />
        </motion.div>

        {/* Bio */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.15 }} className="mb-5">
          <label className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-2 block">Bio</label>
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder="A little about you (shown after mutual match)"
            maxLength={200}
            className="w-full bg-secondary border border-border rounded-xl px-4 py-3 text-foreground placeholder:text-muted-foreground/50 text-sm resize-none h-20 focus:outline-none focus:border-primary/50"
          />
          <span className="text-xs text-muted-foreground">{bio.length}/200</span>
        </motion.div>

        {/* Gender */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }} className="mb-5">
          <label className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-3 block">I identify as</label>
          <div className="grid grid-cols-2 gap-2">
            {genderOptions.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setGender(opt.value)}
                className={`glass-card rounded-xl p-3 text-sm text-left transition-all flex items-center justify-between ${
                  gender === opt.value ? "border-primary/50 glow-gold-sm" : ""
                }`}
              >
                <span className="text-foreground">{opt.label}</span>
                {gender === opt.value && <Check className="w-4 h-4 text-primary" />}
              </button>
            ))}
          </div>
        </motion.div>

        {/* Seeking */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.25 }} className="mb-8">
          <label className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-3 block">Interested in</label>
          <div className="grid grid-cols-3 gap-2">
            {seekingOptions.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setSeekingGender(opt.value)}
                className={`glass-card rounded-xl p-3 text-sm text-center transition-all ${
                  seekingGender === opt.value ? "border-primary/50 glow-gold-sm" : ""
                }`}
              >
                <span className="text-foreground">{opt.label}</span>
              </button>
            ))}
          </div>
        </motion.div>

        {/* Verification Status */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }} className="mb-6">
          <label className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-3 block">Identity Verification</label>
          {verificationStatus === "verified" ? (
            <div className="glass-card rounded-xl p-4 flex items-center gap-3 border-verity-success/20">
              <Shield className="w-5 h-5 text-verity-success" />
              <div>
                <div className="text-sm font-medium text-foreground">Verified ✓</div>
                <div className="text-xs text-muted-foreground">Your identity has been confirmed</div>
              </div>
            </div>
          ) : showSelfieCapture ? (
            <SelfieCapture
              onVerified={async () => {
                if (!user) return;
                await supabase.from("profiles").update({ verification_status: "verified" }).eq("user_id", user.id);
                setVerificationStatus("verified");
                setShowSelfieCapture(false);
                toast({ title: "Verified! ✓", description: "Your identity has been confirmed." });
              }}
            />
          ) : (
            <button
              onClick={() => setShowSelfieCapture(true)}
              className="w-full glass-card rounded-xl p-4 flex items-center gap-3 hover:border-primary/30 transition-colors"
            >
              <Camera className="w-5 h-5 text-primary" />
              <div className="text-left">
                <div className="text-sm font-medium text-foreground">Verify with Selfie</div>
                <div className="text-xs text-muted-foreground">Quick AI liveness check for a trust badge</div>
              </div>
            </button>
          )}
        </motion.div>

        {/* Phone Verification Status */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.35 }} className="mb-6">
          <label className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-3 block">Phone Verification</label>
          {phoneVerified ? (
            <div className="glass-card rounded-xl p-4 flex items-center gap-3 border-verity-success/20">
              <Phone className="w-5 h-5 text-verity-success" />
              <div>
                <div className="text-sm font-medium text-foreground">Phone Verified ✓</div>
                <div className="text-xs text-muted-foreground">Australian mobile verified</div>
              </div>
            </div>
          ) : showPhoneVerification ? (
            <PhoneVerification
              onVerified={() => {
                setPhoneVerified(true);
                setShowPhoneVerification(false);
                toast({ title: "Phone Verified! ✓", description: "Your phone number has been confirmed." });
              }}
            />
          ) : (
            <button
              onClick={() => setShowPhoneVerification(true)}
              className="w-full glass-card rounded-xl p-4 flex items-center gap-3 hover:border-primary/30 transition-colors"
            >
              <Phone className="w-5 h-5 text-primary" />
              <div className="text-left">
                <div className="text-sm font-medium text-foreground">Verify Phone Number</div>
                <div className="text-xs text-muted-foreground">Required for going live — Australian mobile only</div>
              </div>
            </button>
          )}
        </motion.div>

        {/* Government ID Verification */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }} className="mb-6">
          <label className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-3 block">Government ID (Optional)</label>
          <input
            ref={idInputRef}
            type="file"
            accept="image/*,.pdf"
            className="hidden"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (!file || !user) return;
              if (file.size > 10 * 1024 * 1024) {
                toast({ title: "File too large", description: "Maximum 10MB.", variant: "destructive" });
                return;
              }
              setUploadingId(true);
              const ext = file.name.split(".").pop();
              const path = `${user.id}/gov-id-${Date.now()}.${ext}`;
              const { error: uploadError } = await supabase.storage
                .from("government-id")
                .upload(path, file, { upsert: true });

              if (uploadError) {
                toast({ title: "Upload failed", description: uploadError.message, variant: "destructive" });
              } else {
                await supabase.from("profiles").update({
                  government_id_url: path,
                  government_id_status: "pending",
                }).eq("user_id", user.id);
                setGovernmentIdStatus("pending");
                toast({ title: "ID uploaded", description: "Under review for verification badge." });
              }
              setUploadingId(false);
            }}
          />
          {governmentIdStatus === "verified" ? (
            <div className="glass-card rounded-xl p-4 flex items-center gap-3 border-verity-success/20">
              <FileCheck className="w-5 h-5 text-verity-success" />
              <div>
                <div className="text-sm font-medium text-foreground">Government ID Verified ✓</div>
                <div className="text-xs text-muted-foreground">Enhanced trust badge active</div>
              </div>
            </div>
          ) : governmentIdStatus === "pending" ? (
            <div className="glass-card rounded-xl p-4 flex items-center gap-3">
              <Loader2 className="w-5 h-5 text-primary animate-spin" />
              <div>
                <div className="text-sm font-medium text-foreground">Under Review</div>
                <div className="text-xs text-muted-foreground">Your ID is being verified by our team</div>
              </div>
            </div>
          ) : (
            <button
              onClick={() => idInputRef.current?.click()}
              disabled={uploadingId}
              className="w-full glass-card rounded-xl p-4 flex items-center gap-3 hover:border-primary/30 transition-colors disabled:opacity-50"
            >
              {uploadingId ? (
                <Loader2 className="w-5 h-5 text-primary animate-spin" />
              ) : (
                <Upload className="w-5 h-5 text-primary" />
              )}
              <div className="text-left">
                <div className="text-sm font-medium text-foreground">Upload Government ID</div>
                <div className="text-xs text-muted-foreground">For an enhanced verified badge (optional)</div>
              </div>
            </button>
          )}
        </motion.div>

        {/* Save */}
        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          onClick={handleSave}
          disabled={saving}
          className="w-full bg-gradient-gold text-primary-foreground font-semibold py-4 rounded-full glow-gold disabled:opacity-50 mb-4"
        >
          {saving ? "Saving..." : "Save Profile"}
        </motion.button>

        {/* Sign Out */}
        <button
          onClick={handleSignOut}
          className="w-full flex items-center justify-center gap-2 text-destructive text-sm font-medium py-3 rounded-xl bg-destructive/5 hover:bg-destructive/10 transition-colors"
        >
          <LogOut className="w-4 h-4" />
          Sign Out
        </button>
      </div>

      <AppNav />
    </div>
  );
};

export default Profile;
