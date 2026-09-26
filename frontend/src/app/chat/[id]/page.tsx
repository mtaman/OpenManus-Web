import ChatPage from "../page";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function DynamicChatPage({ params }: PageProps) {
  const resolvedParams = await params;
  const jobId = resolvedParams?.id;
  
  if (!jobId) {
    return <ChatPage />;
  }

  return <ChatPage initialJobId={jobId} />;
}