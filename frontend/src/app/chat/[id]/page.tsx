"use client";

import React from "react";
import { useParams } from "next/navigation";
import { ChatContainer } from "@/components/chat/chat-container";

export default function ChatDetailPage() {
  const params = useParams();
  const id = typeof params?.id === "string" ? params.id : undefined;

  return <ChatContainer initialJobId={id} />;
}
