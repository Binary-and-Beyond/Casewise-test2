"use client";
import { Button } from "@/components/ui/button";

interface ActionButtonsProps {
  onGenerateMCQs: () => void;
  onIdentifyConcepts: () => void;
  disabled?: boolean;
}

export function ActionButtons({
  onGenerateMCQs,
  onIdentifyConcepts,
  disabled = false,
}: ActionButtonsProps) {
  return (
    <div className="flex gap-4">
      <Button
        variant="outline"
        className="flex-1 bg-transparent"
        onClick={onIdentifyConcepts}
        disabled={disabled}
      >
        Identify Concepts
      </Button>
      <Button
        variant="outline"
        className="flex-1 bg-transparent"
        onClick={onGenerateMCQs}
        disabled={disabled}
      >
        Generate MCQs
      </Button>
    </div>
  );
}
