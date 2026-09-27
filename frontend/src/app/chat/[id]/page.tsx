"use client";

import React from "react";
import { useParams } from "next/navigation";
import ChatPage from "../page";

export default function ChatDetailPage() {
  const params = useParams();
  const id = params?.id as string;

  return <ChatPage initialJobId={id} />;
}
