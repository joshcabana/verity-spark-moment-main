import { useState } from "react";
import { motion } from "framer-motion";
import { Coins, Zap, Crown, Star, Check, Sparkles } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import AppNav from "@/components/AppNav";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";
const env = import.meta.env as Record<string, string | undefined>;
const DISPLAY_CURRENCY = (env.VITE_DISPLAY_CURRENCY ?? "AUD").toUpperCase();

const getEnvString = (key: string, fallback: string): string => {
  const value = env[key];
  return value && value.trim().length > 0 ? value.trim() : fallback;
};

const getEnvNumber = (key: string, fallback: number): number => {
  const raw = env[key];
  if (!raw) return fallback;
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const formatMoney = (amount: number): string =>
  new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: DISPLAY_CURRENCY,
  }).format(amount);

const tokenPacks = [
  {
    id: 1,
    tokens: 10,
    amount: getEnvNumber("VITE_PRICE_PACK_10_AMOUNT", 12.99),
    popular: false,
    priceId: getEnvString("VITE_STRIPE_PRICE_TOKENS_10", "price_1T2B8ZHHJNu8TYH7wfh5fdNv"),
  },
  {
    id: 2,
    tokens: 15,
    amount: getEnvNumber("VITE_PRICE_PACK_15_AMOUNT", 19.99),
    popular: true,
    priceId: getEnvString("VITE_STRIPE_PRICE_TOKENS_15", "price_1T2B8rHHJNu8TYH7lnqB0oGV"),
  },
  {
    id: 3,
    tokens: 30,
    amount: getEnvNumber("VITE_PRICE_PACK_30_AMOUNT", 34.99),
    popular: false,
    priceId: getEnvString("VITE_STRIPE_PRICE_TOKENS_30", "price_1T2B96HHJNu8TYH7e2Tikj7C"),
  },
].map((pack) => ({
  ...pack,
  price: formatMoney(pack.amount),
  perToken: formatMoney(pack.amount / pack.tokens),
}));

const VERITY_PASS_PRICE_ID = getEnvString("VITE_STRIPE_PRICE_VERITY_PASS", "price_1T2B9NHHJNu8TYH7nFtB11O8");
const VERITY_PASS_AMOUNT = getEnvNumber("VITE_PRICE_VERITY_PASS_AMOUNT", 19.99);

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
  const { user, subscribed } = useAuth();

  const { data: tokenData } = useQuery({
    queryKey: ["user-tokens", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("user_tokens")
        .select("balance, free_entries_remaining")
        .eq("user_id", user!.id)
        .single();
      return data ?? { balance: 0, free_entries_remaining: 0 };
    },
    enabled: Boolean(user),
    staleTime: 15_000, // Refresh balance after 15s on revisit
    refetchOnWindowFocus: true, // Refetch when user returns from Stripe checkout tab
  });

  const balance = tokenData?.balance ?? 0;
  const freeEntries = tokenData?.free_entries_remaining ?? 0;

  const handleManageSubscription = async () => {
    try {
      const { data, error } = await supabase.functions.invoke("customer-portal");
      if (error) throw error;
      if (data?.url) window.open(data.url, "_blank");
    } catch (error) {
      toast({ title: "Error", description: getErrorMessage(error), variant: "destructive" });
    }
  };

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
          className="glass-card rounded-2xl p-5 mb-8 flex items-center justify-between"
        >
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-gradient-gold flex items-center justify-center">
              <Coins className="w-6 h-6 text-primary-foreground" />
            </div>
            <div>
              <div className="text-2xl font-bold text-foreground">{balance}</div>
              <div className="text-xs text-muted-foreground">tokens available</div>
            </div>
          </div>
          <div className="text-right">
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
                className={`relative glass-card rounded-xl p-4 text-center transition-all ${
                  selectedPack === pack.id ? "border-primary/50 glow-gold-sm" : "hover:border-border"
                }`}
              >
                {pack.popular && (
                  <span className="absolute -top-2 left-1/2 -translate-x-1/2 bg-gradient-gold text-primary-foreground text-[10px] font-bold px-3 py-0.5 rounded-full">
                    BEST VALUE
                  </span>
                )}
                <div className="text-2xl font-bold text-foreground mb-0.5">{pack.tokens}</div>
                <div className="text-xs text-muted-foreground mb-2">tokens</div>
                <div className="text-lg font-semibold text-primary">{pack.price}</div>
                <div className="text-[10px] text-muted-foreground">{pack.perToken}/token</div>
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
              <div key={item.label} className="glass-card rounded-xl p-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <item.icon className="w-4 h-4 text-primary" />
                  <span className="text-sm text-foreground">{item.label}</span>
                </div>
                <span className="text-xs text-primary font-medium">{item.cost}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Verity Pass */}
        <motion.div initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
          className="relative glass-card rounded-2xl p-6 border-primary/30 glow-gold-sm"
        >
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
            {formatMoney(VERITY_PASS_AMOUNT)}<span className="text-sm text-muted-foreground font-normal">/month</span>
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
        </motion.div>
      </div>

      <AppNav />
    </div>
  );
};

export default TokenShop;
