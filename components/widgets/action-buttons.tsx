"use client";
import { Button } from "@/components/ui/button";

interface ActionButtonsProps {
  onGenerateMCQs: () => void;
  onIdentifyConcepts: () => void;
}

export function ActionButtons({
  onGenerateMCQs,
  onIdentifyConcepts,
}: ActionButtonsProps) {
  return (
    <div className="flex gap-4">
      <Button
        variant="outline"
        className="flex-1 bg-transparent"
        onClick={onGenerateMCQs}
      >
        Generate MCQs
      </Button>
      <Button
        variant="outline"
        className="flex-1 bg-transparent"
        onClick={onIdentifyConcepts}
      >
        Identify Concepts
      </Button>
    </div>
  );
}
