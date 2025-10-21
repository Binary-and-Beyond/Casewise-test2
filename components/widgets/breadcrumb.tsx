"use client";

interface BreadcrumbProps {
  items: Array<{
    label: string;
    onClick?: () => void;
    isActive?: boolean;
  }>;
  onNavigationAttempt?: (navigationFunction: () => void) => void;
}

export function Breadcrumb({ items, onNavigationAttempt }: BreadcrumbProps) {
  return (
    <div className="text-sm text-gray-600 mb-4">
      {items.map((item, index) => (
        <span key={index}>
          {index > 0 && <span className="mx-1">/</span>}
          <span
            className={`cursor-pointer hover:text-blue-600 ${
              item.isActive ? "text-gray-900" : ""
            }`}
            onClick={() => {
              if (item.onClick) {
                if (onNavigationAttempt) {
                  onNavigationAttempt(item.onClick);
                } else {
                  item.onClick();
                }
              }
            }}
          >
            {item.label}
          </span>
        </span>
      ))}
    </div>
  );
}
