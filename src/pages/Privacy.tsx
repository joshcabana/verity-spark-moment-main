import AppNav from "@/components/AppNav";
import { motion } from "framer-motion";
import { Shield } from "lucide-react";

const Privacy = () => {
  return (
    <div className="min-h-screen bg-background pb-32">
      <div className="pt-16 pb-8 px-6 bg-gradient-to-b from-secondary/50 to-background border-b border-border/50 sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Shield className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="font-display font-bold text-foreground">Privacy Policy</h1>
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Verity Spark Moment</p>
          </div>
        </div>
      </div>

      <div className="p-6">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="prose prose-sm prose-invert max-w-none text-muted-foreground"
        >
          <p>
            At Verity, your privacy is our priority. This Privacy Policy explains how we collect, use, and protect your information, in compliance with the Australian Privacy Principles.
          </p>
          
          <h2 className="text-foreground mt-6 mb-2">1. Information We Collect</h2>
          <p>
            We collect information you provide directly to us, including:
          </p>
          <ul className="list-disc pl-4 mt-2">
            <li>Account details (email, phone number hash)</li>
            <li>Profile information (display name, gender)</li>
            <li>Biometric data (selfie verification analysis) - these images are processed transiently and are not permanently stored or shared with other users.</li>
          </ul>

          <h2 className="text-foreground mt-6 mb-2">2. Live Video and Moderation</h2>
          <p>
            To ensure safety, video calls are monitored by an automated AI moderation system. The system processes video frames transiently to detect policy violations. <strong>We do not record your video calls</strong>. Frames are analyzed and immediately discarded unless a tier 1 violation is detected, in which case a flag is recorded for human review.
          </p>

          <h2 className="text-foreground mt-6 mb-2">3. How We Use Your Data</h2>
          <p>
            We use the information we collect to operate, maintain, and improve our services, to enforce our safety guidelines, and to personalize your experience (e.g., matchmaking).
          </p>

          <h2 className="text-foreground mt-6 mb-2">4. Data Sharing</h2>
          <p>
            We do not sell your personal data. Your display name is only revealed to mutual matches. We may share necessary data with proven third-party service providers (like Stripe for payments and Agora for real-time video infrastructure) solely for operating the service.
          </p>

          <h2 className="text-foreground mt-6 mb-2">5. Your Rights</h2>
          <p>
            You have the right to access, correct, or delete your personal data. You can delete your account and associated data directly within the Verity app settings.
          </p>
        </motion.div>
      </div>
      <AppNav />
    </div>
  );
};

export default Privacy;
