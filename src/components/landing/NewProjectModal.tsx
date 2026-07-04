import { useState } from "react";
import { useRouter } from "@tanstack/react-router";
import { useBookStore } from "@/lib/photobook/store";
import { FIXED_PAGE_SIZE_ID } from "@/lib/photobook/types";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { BookOpen, ChevronRight } from "lucide-react";

interface NewProjectModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function NewProjectModal({ open, onOpenChange }: NewProjectModalProps) {
  const [projectName, setProjectName] = useState("");
  const router = useRouter();
  const resetBook = useBookStore((s) => s.resetBook);
  const setTitle = useBookStore((s) => s.setTitle);
  const addRecentProject = useBookStore((s) => s.addRecentProject);

  const handleCreate = () => {
    resetBook();
    const name = projectName.trim() || "My Yaara Book";
    setTitle(name);
    const id = `proj_${Date.now()}`;
    addRecentProject(id, name, FIXED_PAGE_SIZE_ID);
    onOpenChange(false);
    setProjectName("");
    router.navigate({ to: "/editor" });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90dvh] overflow-y-auto flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <BookOpen className="h-5 w-5 text-amber-600" />
            Create New Project
          </DialogTitle>
          <DialogDescription>
            Give your project a name to get started.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 pt-1">
          {/* Project Name */}
          <div className="space-y-1.5">
            <Label htmlFor="project-name">Project Name</Label>
            <Input
              id="project-name"
              placeholder="e.g. Birthday Album, Wedding Book..."
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCreate()}
              autoFocus
            />
          </div>

          <div className="flex gap-3 pt-1">
            <Button variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              className="flex-1 gap-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white hover:from-amber-600 hover:to-orange-600 border-0"
              onClick={handleCreate}
            >
              Create Project
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
