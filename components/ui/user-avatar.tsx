"use client";

import React, { useState } from "react";
import Image from "next/image";

interface UserAvatarProps {
  src?: string;
  alt: string;
  size?: number;
  className?: string;
  fallbackText?: string;
  showFallbackIcon?: boolean;
}

export function UserAvatar({
  src,
  alt,
  size = 32,
  className = "",
  fallbackText,
  showFallbackIcon = true,
}: UserAvatarProps) {
  const [imageError, setImageError] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);

  const handleImageError = () => {
    setImageError(true);
  };

  const handleImageLoad = () => {
    setImageLoaded(true);
  };

  // If no src or image failed to load, show fallback
  if (!src || imageError) {
    return (
      <div
        className={`bg-gray-300 rounded-full flex items-center justify-center ${className}`}
        style={{ width: size, height: size }}
      >
        {fallbackText ? (
          <span className="text-white text-sm font-medium">{fallbackText}</span>
        ) : showFallbackIcon ? (
          <svg
            className="w-4 h-4 text-gray-500"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path
              fillRule="evenodd"
              d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z"
              clipRule="evenodd"
            />
          </svg>
        ) : null}
      </div>
    );
  }

  return (
    <div
      className={`rounded-full overflow-hidden ${className}`}
      style={{ width: size, height: size }}
    >
      <Image
        src={src}
        alt={alt}
        width={size}
        height={size}
        className="w-full h-full object-cover"
        onError={handleImageError}
        onLoad={handleImageLoad}
      />
    </div>
  );
}
