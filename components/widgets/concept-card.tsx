"use client";

interface ConceptCardProps {
  concept: string;
  index: number;
}

export function ConceptCard({ concept, index }: ConceptCardProps) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-sm cursor-pointer">
      <span className="font-medium text-gray-900">
        {index + 1}) {concept}
      </span>
    </div>
  );
}
