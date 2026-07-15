"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { createComment } from "@/server/actions/comments";
import { content } from "@theme/content";

const MAX = 2000;

export function CommentForm({ postId }: { postId: string }) {
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const r = await createComment(postId, text);
      if (!r.ok) { setError(r.error); return; }
      setText("");
      router.refresh();
    });
  };

  const overLimit = text.length > MAX;
  const nearLimit = text.length > 1900;

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-2">
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={content.comments.placeholder}
        className="w-full min-h-[80px] max-h-[400px] p-3 rounded-md border border-border bg-background text-sm resize-y focus:outline-none focus:ring-2 focus:ring-ring"
        disabled={isPending}
        required
      />
      <div className="flex items-center justify-between">
        <span className={`text-xs ${overLimit ? "text-destructive" : nearLimit ? "text-amber-600" : "text-muted-foreground"}`}>
          {content.comments.charCount(text.length)}
        </span>
        <Button type="submit" pending={isPending} disabled={overLimit || text.trim().length === 0}>
          {content.comments.submit}
        </Button>
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </form>
  );
}
