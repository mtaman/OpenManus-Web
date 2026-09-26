"use client";

import { use } from "react";
import ChatPage from "../page";

export default function DynamicChatSessionPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  return <ChatPage initialJobId={resolvedParams.id} />;
}