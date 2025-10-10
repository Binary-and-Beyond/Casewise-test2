"use client";

interface StatsCardProps {
  label: string;
  value: string;
  badge?: string;
}

export function StatsCard({ label, value, badge }: StatsCardProps) {
  return (
    <div>
      <p className="text-sm text-gray-500 mb-1">{label}</p>
      <div className="flex items-center">
        <p className="text-lg font-medium text-gray-900 mr-2">{value}</p>
        {badge && (
          <span className="bg-orange-500 text-white text-xs px-2 py-1 rounded-full">
            {badge}
          </span>
        )}
      </div>
    </div>
  );
}
