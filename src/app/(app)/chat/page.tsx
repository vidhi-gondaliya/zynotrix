"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useChat } from "@/store/useChat";
import { Hash } from "lucide-react";

export default function ChatPage() {
  const router = useRouter();
  const { channels, setChannels } = useChat();

  useEffect(() => {
    fetch("/api/channels")
      .then((r) => r.json())
      .then((data) => {
        setChannels(data);
        if (data.length > 0) router.push(`/chat/${data[0].id}`);
      });
  }, [router, setChannels]);

  return (
    <div className="flex items-center justify-center h-full text-muted">
      <div className="text-center">
        <Hash className="w-12 h-12 mx-auto mb-3 opacity-20" />
        <p className="text-sm">Select a channel to start chatting</p>
      </div>
    </div>
  );
}
