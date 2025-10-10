"use client";
import { ConceptCard } from "./concept-card";

interface ConceptsListProps {
  concepts: string[];
}

export function ConceptsList({ concepts }: ConceptsListProps) {
  return (
    <div className="space-y-4 mb-8">
      {concepts.map((concept, index) => (
        <ConceptCard key={index} concept={concept} index={index} />
      ))}
    </div>
  );
}
