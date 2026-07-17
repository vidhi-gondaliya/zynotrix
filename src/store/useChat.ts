"use client";
import { create } from "zustand";
import type { Channel, Message } from "@/types";

interface ChatStore {
  channels: Channel[];
  activeChannelId: string | null;
  messages: Record<string, Message[]>;
  setChannels: (channels: Channel[]) => void;
  setActiveChannel: (id: string) => void;
  setMessages: (channelId: string, messages: Message[]) => void;
  addMessage: (channelId: string, message: Message) => void;
}

export const useChat = create<ChatStore>((set) => ({
  channels: [],
  activeChannelId: null,
  messages: {},
  setChannels: (channels) => set({ channels }),
  setActiveChannel: (activeChannelId) => set({ activeChannelId }),
  setMessages: (channelId, messages) =>
    set((state) => ({ messages: { ...state.messages, [channelId]: messages } })),
  addMessage: (channelId, message) =>
    set((state) => ({
      messages: {
        ...state.messages,
        [channelId]: [...(state.messages[channelId] ?? []), message],
      },
    })),
}));
