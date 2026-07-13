import { useEffect, useState } from "react";
import { Check, Copy, Link2, Loader2, Share2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { createSharedBook, deleteSharedBook } from "@/lib/api/shares.functions";
import {
  addMyShare,
  collectBookImages,
  getMyShares,
  getSharerName,
  removeMyShare,
  setSharerName,
  type MyShare,
} from "@/lib/photobook/share";
import type { Book } from "@/lib/photobook/types";

export function ShareModal({
  open,
  onOpenChange,
  book,
  title,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  book: Book;
  title: string;
}) {
  const [name, setName] = useState("");
  const [creating, setCreating] = useState(false);
  const [link, setLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [myShares, setMyShares] = useState<MyShare[]>([]);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setName(getSharerName());
    setMyShares(getMyShares());
    setLink(null);
    setCopied(false);
  }, [open]);

  const copy = async (value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
      toast.success("Link copied to clipboard");
    } catch {
      toast.error("Could not copy — long-press the link to copy it.");
    }
  };

  const handleCreate = async () => {
    const sharerName = name.trim();
    if (!sharerName) {
      toast.error("Add your name so the recipient knows who shared it.");
      return;
    }
    setSharerName(sharerName);
    setCreating(true);
    const toastId = toast.loading("Preparing your share link…");
    try {
      const images = await collectBookImages(book);
      const result = await createSharedBook({
        data: { book, images, sharedBy: sharerName, title },
      });
      if (!result.success) {
        throw new Error(result.error || "Could not create the link");
      }
      const url = `${window.location.origin}/preview?share=${result.id}`;
      const share: MyShare = {
        id: result.id,
        deleteToken: result.deleteToken,
        title: title || "Untitled photobook",
        url,
        createdAt: Date.now(),
      };
      addMyShare(share);
      setMyShares(getMyShares());
      setLink(url);
      toast.success("Share link ready!", { id: toastId });
      void copy(url);
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : "Could not create the link", {
        id: toastId,
      });
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (share: MyShare) => {
    setDeletingId(share.id);
    try {
      const result = await deleteSharedBook({
        data: { id: share.id, deleteToken: share.deleteToken },
      });
      if (!result.success) throw new Error(result.error || "Could not delete the link");
      removeMyShare(share.id);
      setMyShares(getMyShares());
      if (link === share.url) setLink(null);
      toast.success("Shared link deleted");
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : "Could not delete the link");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2 className="h-5 w-5 text-accent" />
            Share this photobook
          </DialogTitle>
          <DialogDescription>
            Create a magic link. Anyone who opens it sees your book in the preview — no account
            needed.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <label htmlFor="share-name" className="mb-1.5 block text-xs font-semibold">
              Your name
            </label>
            <Input
              id="share-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Priya"
              maxLength={80}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !creating) handleCreate();
              }}
            />
            <p className="mt-1 text-[11px] text-muted-foreground">
              Shown to the recipient as “Shared by {name.trim() || "…"}”. Saved for next time.
            </p>
          </div>

          {link ? (
            <div className="rounded-lg border bg-muted/40 p-2.5">
              <div className="flex items-center gap-2">
                <Link2 className="h-4 w-4 shrink-0 text-muted-foreground" />
                <span className="min-w-0 flex-1 truncate font-mono text-xs">{link}</span>
                <Button size="sm" variant="outline" className="h-8 gap-1.5" onClick={() => copy(link)}>
                  {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                  {copied ? "Copied" : "Copy"}
                </Button>
              </div>
            </div>
          ) : (
            <Button className="w-full gap-2" disabled={creating} onClick={handleCreate}>
              {creating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Creating link…
                </>
              ) : (
                <>
                  <Share2 className="h-4 w-4" /> Create share link
                </>
              )}
            </Button>
          )}

          {myShares.length > 0 && (
            <div className="space-y-1.5 border-t pt-3">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Your shared links
              </div>
              <div className="max-h-40 space-y-1.5 overflow-y-auto pr-1">
                {myShares.map((share) => (
                  <div
                    key={share.id}
                    className="flex items-center gap-2 rounded-md border bg-card px-2.5 py-1.5"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-xs font-semibold">{share.title}</div>
                      <div className="truncate text-[10px] text-muted-foreground">{share.url}</div>
                    </div>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 shrink-0"
                      title="Copy link"
                      aria-label={`Copy link to ${share.title}`}
                      onClick={() => copy(share.url)}
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 shrink-0 text-destructive hover:bg-destructive/10 hover:text-destructive"
                      title="Delete this shared link"
                      aria-label={`Delete shared link for ${share.title}`}
                      disabled={deletingId === share.id}
                      onClick={() => handleDelete(share)}
                    >
                      {deletingId === share.id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Trash2 className="h-3.5 w-3.5" />
                      )}
                    </Button>
                  </div>
                ))}
              </div>
              <p className="text-[10px] text-muted-foreground">
                Deleting a link permanently removes the shared copy and its photos.
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
