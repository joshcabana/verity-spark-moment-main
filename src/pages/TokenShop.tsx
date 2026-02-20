import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Coins, Zap, Crown, Star, Check, Sparkles } from "lucide-react";
import AppNav from "@/components/AppNav";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";
const tokenPacks = [
  { id: 1, tokens: 10, price: "$12.99", perToken: "$1.30", popular: false, priceId: "price_1T2B8ZHHJNu8TYH7wfh5fdNv" },
  { id: 2, tokens: 15, price: "$19.99", perToken: "$1.33", popular: true, priceId: "price_1T2B8rHHJNu8TYH7lnqB0oGV" },
  { id: 3, tokens: 30, price: "$34.99", perToken: "$1.17", popular: false, priceId: "price_1T2B96HHJNu8TYH7e2Tikj7C" },
];

const VERITY_PASS_PRICE_ID = "price_1T2B9NHHJNu8TYH7nFtB11O8";

const passFeatures = [
  "Unlimited entries",
  "Priority queue matching",
  "1 free Spark Extension daily",
  "All themed room access",
  "Spark analytics & insights",
  "Ad-free experience",
];

const getErrorMessage = (error: unknown) => {
  if (error instanceof Error) return error.message;
  return "Could not complete request.";
};

const TokenShop = () => {
  const [selectedPack, setSelectedPack] = useState(2);
  const [balance, setBalance] = useState(0);
  const [freeEntries, setFreeEntries] = useState(0);
  const { user, subscribed } = useAuth();

  const handleManageSubscription = async () => {
    try {
      const { data, error } = await supabase.functions.invoke("customer-portal");
      if (error) throw error;
      if (data?.url) window.open(data.url, "_blank");
    } catch (error) {
      toast({ title: "Error", description: getErrorMessage(error), variant: "destructive" });
    }
  };

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const { data } = await supabase
        .from("user_tokens")
        .select("balance, free_entries_remaining")
        .eq("user_id", user.id)
        .single();
      if (data) {
        setBalance(data.balance);
        setFreeEntries(data.free_entries_remaining);
      }
    };
    load();
  }, [user]);

  const handlePurchase = async (priceId: string) => {
    if (!user) {
      toast({ title: "Sign in required", description: "Please sign in to purchase." });
      return;
    }
    try {
      const { data, error } = await supabase.functions.invoke("create-checkout", {
        body: { priceId },
      });
      if (error) throw error;
      if (data?.url) window.open(data.url, "_blank");
    } catch (error) {
      toast({ title: "Error", description: getErrorMessage(error), variant: "destructive" });
    }
  };

  return (
    <div className="min-h-screen bg-background px-6 pt-8 pb-24">
      <div className="max-w-lg mx-auto">
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-8">
          <h1 className="font-display text-3xl font-bold text-gradient-gold mb-1">Tokens & Pass</h1>
          <p className="text-muted-foreground text-sm">Invest in real connections. No subscription fatigue.</p>
        </motion.div>

        {/* Current balance */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}
          className="glass-card rounded-2xl p-5 mb-8 flex items-center justify-between relative overflow-hidden"
        >
          <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent pointer-events-none" />
          <div className="flex items-center gap-3 relative z-10">
            <div className="w-12 h-12 rounded-full bg-gradient-gold flex items-center justify-center">
              <Coins className="w-6 h-6 text-primary-foreground" />
            </div>
            <div>
              <div className="text-2xl font-bold text-foreground">{balance}</div>
              <div className="text-xs text-muted-foreground">tokens available</div>
            </div>
          </div>
          <div className="text-right relative z-10">
            <div className="text-sm text-foreground font-medium">{freeEntries} free entries</div>
            <div className="text-xs text-muted-foreground">left this week</div>
          </div>
        </motion.div>

        {/* Token Packs */}
        <div className="mb-10">
          <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
            <Zap className="w-4 h-4" /> Token Packs
          </h2>
          <div className="grid grid-cols-2 gap-3">
            {tokenPacks.map((pack) => (
              <motion.button
                key={pack.id}
                whileTap={{ scale: 0.97 }}
                onClick={() => setSelectedPack(pack.id)}
                className={`relative glass-card rounded-xl p-4 text-center transition-all overflow-hidden ${
                  selectedPack === pack.id ? "border-primary/50 glow-gold-sm" : "hover:border-border"
                }`}
              >
                <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent pointer-events-none" />
                {pack.popular && (
                  <span className="absolute -top-2 left-1/2 -translate-x-1/2 bg-gradient-gold text-primary-foreground text-[10px] font-bold px-3 py-0.5 rounded-full z-10">
                    BEST VALUE
                  </span>
                )}
                <div className="relative z-10">
                  <div className="text-2xl font-bold text-foreground mb-0.5">{pack.tokens}</div>
                  <div className="text-xs text-muted-foreground mb-2">tokens</div>
                  <div className="text-lg font-semibold text-primary">{pack.price}</div>
                  <div className="text-[10px] text-muted-foreground">{pack.perToken}/token</div>
                </div>
              </motion.button>
            ))}
          </div>
          <button onClick={() => handlePurchase(tokenPacks.find(p => p.id === selectedPack)?.priceId || "")} className="w-full mt-4 bg-gradient-gold text-primary-foreground font-semibold py-4 rounded-full glow-gold">
            Purchase Tokens
          </button>
        </div>

        {/* What tokens buy */}
        <div className="mb-10">
          <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-3">Use Tokens For</h2>
          <div className="space-y-2">
            {[
              { icon: Zap, label: "Extra entries beyond free limit", cost: "1 token" },
              { icon: Star, label: "Priority queue — match faster", cost: "2 tokens" },
              { icon: Sparkles, label: "90-second Spark Extension", cost: "1 token" },
              { icon: Crown, label: "Premium themed rooms", cost: "1 token" },
            ].map((item) => (
              <div key={item.label} className="glass-card rounded-xl p-3 flex items-center justify-between relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent pointer-events-none" />
                <div className="flex items-center gap-3 relative z-10">
                  <item.icon className="w-4 h-4 text-primary" />
                  <span className="text-sm text-foreground">{item.label}</span>
                </div>
                <span className="text-xs text-primary font-medium relative z-10">{item.cost}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Verity Pass */}
        <motion.div initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
          className="relative glass-card rounded-2xl p-6 border-primary/30 glow-gold-sm overflow-hidden"
        >
          <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent pointer-events-none" />
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-gradient-gold flex items-center justify-center">
                <Crown className="w-5 h-5 text-primary-foreground" />
              </div>
              <div>
                <h3 className="font-display text-xl font-bold text-foreground">Verity Pass</h3>
                <p className="text-muted-foreground text-xs">The premium experience</p>
              </div>
            </div>
            <div className="text-3xl font-bold text-foreground mb-1">
              $19.99<span className="text-sm text-muted-foreground font-normal">/month</span>
            </div>
            <ul className="space-y-2 my-5">
              {passFeatures.map((feature) => (
                <li key={feature} className="flex items-center gap-2 text-sm text-foreground/80">
                  <Check className="w-4 h-4 text-verity-success shrink-0" />
                  {feature}
                </li>
              ))}
            </ul>
            <button onClick={() => handlePurchase(VERITY_PASS_PRICE_ID)} className="w-full bg-gradient-gold text-primary-foreground font-semibold py-4 rounded-full glow-gold">
              Subscribe to Verity Pass
            </button>
            {subscribed && (
              <button
                onClick={handleManageSubscription}
                className="w-full mt-3 border border-primary/30 text-primary font-medium py-3 rounded-full hover:bg-primary/5 transition-colors text-sm"
              >
                Manage Subscription
              </button>
            )}
          </div>
        </motion.div>
      </div>

      <AppNav />
    </div>
  );
};

export default TokenShop;
