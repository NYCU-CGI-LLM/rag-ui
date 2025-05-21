import { PageLayout } from "@/components/page-layout";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function Home() {
  return (
    <PageLayout>
      <div className="space-y-8 py-12 max-w-6xl mx-auto">
        <div className="space-y-2 text-center">
          <h1 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl">
            Retrieval-Augmented Generation UI
          </h1>
          <p className="mx-auto max-w-[700px] text-muted-foreground md:text-xl">
            A powerful RAG system that helps you chat with your documents,
            manage your knowledge libraries, and evaluate performance.
          </p>
        </div>
        <div className="flex justify-center gap-4">
          <Button asChild>
            <Link href="/chat">Start Chatting</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/library">Manage Libraries</Link>
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pt-8">
          <div className="rounded-lg border bg-card p-6">
            <h3 className="text-lg font-semibold mb-2">Library Management</h3>
            <p className="text-muted-foreground">
            Create libraries and upload files, and delete specific files when needed.
            </p>
          </div>
          <div className="rounded-lg border bg-card p-6">
            <h3 className="text-lg font-semibold mb-2">Chat Interface</h3>
            <p className="text-muted-foreground">
              Chat with AI powered by your document libraries. Two sidebars let
              you navigate between chat sessions and select your personal
              libraries.
            </p>
          </div>
          <div className="rounded-lg border bg-card p-6">
            <h3 className="text-lg font-semibold mb-2">Evaluation</h3>
            <p className="text-muted-foreground">
              Evaluate RAG performance on different benchmarks for both
              information retrieval and generated text quality.
            </p>
          </div>
        </div>
      </div>
    </PageLayout>
  );
}
