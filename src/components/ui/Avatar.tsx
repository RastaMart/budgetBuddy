import React from "react";

interface AvatarProps {
  avatarUrl?: string | null;
  name?: string | null;
  email?: string;
  size?: "sm" | "md" | "lg";
  showRing?: boolean;
}

export function Avatar({
  avatarUrl,
  name,
  email,
  size = "md",
  showRing = false,
}: AvatarProps) {
  // Determine which text to use for the fallback (name or email)
  const displayText = name || email || "";

  // Get the first letter as fallback
  const initial = displayText[0]?.toUpperCase() || "";

  // Size mappings
  const sizeClasses = {
    sm: "h-6 w-6 text-xs",
    md: "h-8 w-8 text-sm",
    lg: "h-10 w-10 text-base",
  };

  // Ring styling if needed
  const ringClass = showRing ? "ring-2 ring-white" : "";

  return (
    <div
      className={`${sizeClasses[size]} rounded-full bg-gray-200 flex items-center justify-center ${ringClass}`}
    >
      {avatarUrl ? (
        <img
          src={avatarUrl}
          alt={displayText}
          className={`${sizeClasses[size]} rounded-full`}
        />
      ) : (
        <span className="font-medium text-gray-600">{initial}</span>
      )}
    </div>
  );
}
