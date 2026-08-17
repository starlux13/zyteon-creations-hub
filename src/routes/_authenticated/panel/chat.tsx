import { useEffect, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Send, Users } from "lucide-react";
import { toast } from "sonner";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/panel/chat")({
  component: ChatPage,
});

type MessageRow = {
  id: string;
  sender_id: string;
  recipient_id: string | null;
  body: string;
  created_at: string;
};

type ProfileRow = {
  id: string;
  display_name: string;
  avatar_url: string | null;
  title: string;
};

function ChatPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [target, setTarget] = useState<string | null>(null); // null = grupal
  const [text, setText] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  const profilesQuery = useQuery({
    queryKey: ["profiles"],
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("id, display_name, avatar_url, title")
        .order("created_at");
      return (data ?? []) as ProfileRow[];
    },
  });

  const messagesQuery = useQuery({
    queryKey: ["messages"],
    queryFn: async () => {
      const { data } = await supabase
        .from("messages")
        .select("id, sender_id, recipient_id, body, created_at")
        .order("created_at", { ascending: true });
      return (data ?? []) as MessageRow[];
    },
  });

  useEffect(() => {
    const channel = supabase
      .channel("team-messages")
      .on("postgres_changes", { event: "*", schema: "public", table: "messages" }, () => {
        void queryClient.invalidateQueries({ queryKey: ["messages"] });
      })
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [queryClient]);

  const all = messagesQuery.data ?? [];
  const visible = all.filter((m) =>
    target === null
      ? m.recipient_id === null
      : (m.sender_id === user?.id && m.recipient_id === target) ||
        (m.sender_id === target && m.recipient_id === user?.id),
  );

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" });
  }, [visible.length, target]);

  const send = async () => {
    if (!user || !text.trim()) return;
    const { error } = await supabase
      .from("messages")
      .insert({ sender_id: user.id, recipient_id: target, body: text.trim() });
    if (error) {
      toast.error(error.message);
      return;
    }
    setText("");
    await queryClient.invalidateQueries({ queryKey: ["messages"] });
  };

  const profiles = (profilesQuery.data ?? []).filter((p) => p.id !== user?.id);
  const nameOf = (id: string) =>
    (profilesQuery.data ?? []).find((p) => p.id === id)?.display_name ?? "Integrante";

  return (
    <div className="mx-auto grid max-w-5xl gap-5 lg:grid-cols-[260px_1fr]">
      <aside className="space-y-2">
        <button
          onClick={() => setTarget(null)}
          className={`surface-panel flex w-full items-center gap-3 rounded-xl p-3 text-left ${
            target === null ? "ring-2 ring-primary" : ""
          }`}
        >
          <Users className="h-5 w-5 text-primary" />
          <div>
            <p className="text-sm font-semibold">Zyteon Team</p>
            <p className="text-xs text-muted-foreground">Chat grupal</p>
          </div>
        </button>
        {profiles.map((profile) => (
          <button
            key={profile.id}
            onClick={() => setTarget(profile.id)}
            className={`surface-panel flex w-full items-center gap-3 rounded-xl p-3 text-left ${
              target === profile.id ? "ring-2 ring-primary" : ""
            }`}
          >
            <Avatar className="h-8 w-8">
              <AvatarImage src={profile.avatar_url ?? undefined} />
              <AvatarFallback>{profile.display_name.slice(0, 2).toUpperCase()}</AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{profile.display_name}</p>
              <p className="truncate text-xs text-muted-foreground">{profile.title}</p>
            </div>
          </button>
        ))}
      </aside>

      <section className="surface-panel flex h-[72vh] flex-col rounded-2xl">
        <header className="border-b border-border px-4 py-3">
          <p className="font-display font-semibold">
            {target === null ? "Zyteon Team" : nameOf(target)}
          </p>
        </header>
        <div className="flex-1 space-y-3 overflow-y-auto p-4">
          {visible.map((message) => {
            const mine = message.sender_id === user?.id;
            return (
              <div key={message.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[75%] rounded-2xl px-4 py-2 text-sm ${
                    mine ? "bg-primary text-primary-foreground" : "bg-surface text-foreground"
                  }`}
                >
                  {!mine ? (
                    <p className="mb-1 text-xs font-semibold opacity-70">
                      {nameOf(message.sender_id)}
                    </p>
                  ) : null}
                  <p className="whitespace-pre-wrap">{message.body}</p>
                  <p className="mt-1 text-[10px] opacity-60">
                    {new Date(message.created_at).toLocaleTimeString()}
                  </p>
                </div>
              </div>
            );
          })}
          {!visible.length ? (
            <p className="text-sm text-muted-foreground">Aún no hay mensajes en esta conversación.</p>
          ) : null}
          <div ref={bottomRef} />
        </div>
        <div className="flex gap-2 border-t border-border p-3">
          <Input
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void send();
              }
            }}
            placeholder="Escribe un mensaje…"
          />
          <Button onClick={send} aria-label="Enviar">
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </section>
    </div>
  );
}
