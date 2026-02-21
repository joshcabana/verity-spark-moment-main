import AppNav from "@/components/AppNav";
import { motion } from "framer-motion";
import { Shield } from "lucide-react";

const Terms = () => {
  return (
    <div className="min-h-screen bg-background pb-32">
      <div className="pt-16 pb-8 px-6 bg-gradient-to-b from-secondary/50 to-background border-b border-border/50 sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Shield className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="font-display font-bold text-foreground">Terms of Service</h1>
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
            Welcome to Verity. By accessing or using our application, you agree to comply with and be bound by these Terms of Service.
          </p>
          
          <h2 className="text-foreground mt-6 mb-2">1. Eligibility</h2>
          <p>
            You must be at least 18 years old to use Verity. By creating an account, you represent and warrant that you meet this requirement.
          </p>

          <h2 className="text-foreground mt-6 mb-2">2. User Conduct</h2>
          <p>
            You agree not to use the service for any unlawful purpose or in any way that interrupts, damages, or impairs the service. We employ AI moderation to monitor video calls for violations of our zero-tolerance policy against explicit or abusive content. Violations will result in immediate termination of the call and potential permanent ban.
          </p>

          <h2 className="text-foreground mt-6 mb-2">3. Account Security</h2>
          <p>
            You are responsible for maintaining the confidentiality of your account credentials. Verity reserves the right to terminate accounts that compromise platform security or violate these terms.
          </p>

          <h2 className="text-foreground mt-6 mb-2">4. Subscriptions and Purchases</h2>
          <p>
            Certain features may require a premium subscription or the purchase of tokens. Payments are processed securely via Stripe. All purchases are non-refundable except where required by Australian Consumer Law.
          </p>

          <h2 className="text-foreground mt-6 mb-2">5. Disclaimer of Warranties</h2>
          <p>
            Verity is provided "as is" without warranty of any kind. We do not guarantee continuous, uninterrupted, or secure access to the service.
          </p>
        </motion.div>
      </div>
      <AppNav />
    </div>
  );
};

export default Terms;
