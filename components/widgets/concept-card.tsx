"use client";

interface ConceptCardProps {
  concept: string;
  index: number;
  onClick: () => void;
}

export function ConceptCard({ concept, index, onClick }: ConceptCardProps) {
  return (
    <div
      className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-sm cursor-pointer transition-shadow"
      onClick={onClick}
    >
      <span className="font-medium text-gray-900">
        {index + 1}) {concept}
      </span>
    </div>
  );
}
