import { useState, useEffect, useRef, useMemo } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Send, Shield } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";
import { getPilotMetadata, trackPilotEvent } from "@/lib/analytics";
import { ChatPrefillStateSchema } from "@/lib/post-spark";

interface Message {
  id: string;
  content: string;
  sender_id: string;
  created_at: string;
}

const Chat = () => {
  const { matchId } = useParams<{ matchId: string }>();
  const { user } = useAuth();
  const pilotMetadata = useMemo(() => getPilotMetadata(user?.user_metadata), [user?.user_metadata]);
  const navigate = useNavigate();
  const location = useLocation();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [chatRoomId, setChatRoomId] = useState<string | null>(null);
  const [otherName, setOtherName] = useState("Your Spark");
  const [reactionNote, setReactionNote] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const prefillAppliedRef = useRef(false);

  useEffect(() => {
    if (prefillAppliedRef.current) return;
    const parsed = ChatPrefillStateSchema.safeParse(location.state);
    if (!parsed.success || !parsed.data.prefillMessage) return;

    setInput(parsed.data.prefillMessage);
    prefillAppliedRef.current = true;
  }, [location.state]);

  useEffect(() => {
    if (!matchId) {
      toast({ title: "Invalid chat link", description: "Missing match reference.", variant: "destructive" });
      navigate("/sparks");
      return;
    }

    if (!user) return;

    const loadChat = async () => {
      // Get match details
      const { data: match } = await supabase
        .from("matches")
        .select("*")
        .eq("id", matchId)
        .single();

      if (!match) {
        toast({ title: "Match unavailable", description: "Could not load this chat.", variant: "destructive" });
        navigate("/sparks");
        return;
      }

      const otherId = match.user1_id === user.id ? match.user2_id : match.user1_id;
      const note = match.user1_id === user.id ? match.user2_note : match.user1_note;
      setReactionNote(note);

      // Get other user's name
      const { data: profile } = await supabase
        .from("profiles")
        .select("display_name")
        .eq("user_id", otherId)
        .single();

      if (profile?.display_name) setOtherName(profile.display_name);

      // Get or create chat room
      let { data: room } = await supabase
        .from("chat_rooms")
        .select("id")
        .eq("match_id", matchId)
        .single();

      if (!room) {
        const { data: newRoom } = await supabase
          .from("chat_rooms")
          .insert({ match_id: matchId })
          .select("id")
          .single();
        room = newRoom;
      }

      if (!room) {
        toast({ title: "Chat unavailable", description: "Chat room could not be created.", variant: "destructive" });
        navigate("/sparks");
        return;
      }
      setChatRoomId(room.id);
      trackPilotEvent("chat_started", {
        ...pilotMetadata,
        matchId,
        chatRoomId: room.id,
      });

      // Load messages
      const { data: msgs } = await supabase
        .from("messages")
        .select("*")
        .eq("chat_room_id", room.id)
        .order("created_at", { ascending: true });

      if (msgs) setMessages(msgs);
    };

    void loadChat();
  }, [matchId, user, navigate, pilotMetadata]);

  // Realtime subscription
  useEffect(() => {
    if (!chatRoomId) return;

    const channel = supabase
      .channel(`chat-${chatRoomId}`)
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "messages",
        filter: `chat_room_id=eq.${chatRoomId}`,
      }, (payload) => {
        setMessages((prev) => [...prev, payload.new as Message]);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [chatRoomId]);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || !chatRoomId || !user) return;
    const content = input.trim();
    setInput("");

    await supabase.from("messages").insert({
      chat_room_id: chatRoomId,
      sender_id: user.id,
      content,
    });
  };

  return (
    <div className="fixed inset-0 bg-background flex flex-col">
      {/* Header */}
      <div className="glass-card border-b border-border/30 px-4 py-3 flex items-center gap-3">
        <button onClick={() => navigate("/sparks")} className="text-muted-foreground">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="w-8 h-8 rounded-full bg-gradient-gold flex items-center justify-center">
          <span className="text-sm">✨</span>
        </div>
        <div className="flex-1">
          <div className="text-sm font-medium text-foreground">{otherName}</div>
          <div className="text-[10px] text-muted-foreground flex items-center gap-1">
            <Shield className="w-2.5 h-2.5 text-verity-success" /> Moderated chat
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {reactionNote && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center py-4"
          >
            <p className="text-xs text-muted-foreground mb-1">Their reaction note</p>
            <div className="inline-block glass-card rounded-xl px-4 py-2 text-sm text-foreground italic">
              "{reactionNote}"
            </div>
          </motion.div>
        )}

        {messages.length === 0 && !reactionNote && (
          <div className="text-center py-12">
            <p className="text-muted-foreground text-sm">Say hello! You both felt the spark ✨</p>
          </div>
        )}

        {messages.map((msg) => {
          const isMine = msg.sender_id === user?.id;
          return (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex ${isMine ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-sm ${
                  isMine
                    ? "bg-primary text-primary-foreground rounded-br-sm"
                    : "glass-card text-foreground rounded-bl-sm"
                }`}
              >
                {msg.content}
              </div>
            </motion.div>
          );
        })}
        <div ref={scrollRef} />
      </div>

      {/* Input */}
      <div className="glass-card border-t border-border/30 px-4 py-3">
        <div className="flex items-center gap-2 max-w-lg mx-auto">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && sendMessage()}
            placeholder="Message..."
            className="flex-1 bg-secondary border border-border rounded-full px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/50"
          />
          <button
            onClick={sendMessage}
            disabled={!input.trim()}
            className="w-10 h-10 rounded-full bg-gradient-gold flex items-center justify-center disabled:opacity-50"
          >
            <Send className="w-4 h-4 text-primary-foreground" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default Chat;
