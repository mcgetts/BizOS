import React from 'react';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { getRoleTheme, getInitials } from '@/lib/roleThemes';
import type { EnhancedUserRole } from '@shared/permissions';
import { cn } from '@/lib/utils';

interface UserAvatarProps {
  firstName?: string;
  lastName?: string;
  profileImageUrl?: string;
  role?: EnhancedUserRole | string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  showBorder?: boolean;
}

const sizeClasses = {
  sm: 'h-8 w-8 text-xs',
  md: 'h-10 w-10 text-sm',
  lg: 'h-12 w-12 text-base',
  xl: 'h-16 w-16 text-lg',
};

export function UserAvatar({
  firstName,
  lastName,
  profileImageUrl,
  role,
  size = 'md',
  className,
  showBorder = false,
}: UserAvatarProps) {
  const theme = getRoleTheme(role);
  const initials = getInitials(firstName, lastName);

  return (
    <Avatar
      className={cn(
        sizeClasses[size],
        showBorder && `ring-2 ${theme.border.replace('border-', 'ring-')}`,
        className
      )}
    >
      {profileImageUrl ? (
        <AvatarImage src={profileImageUrl} alt={`${firstName} ${lastName}`} />
      ) : null}
      <AvatarFallback
        className={cn(
          theme.avatarBg,
          theme.avatarText,
          'font-semibold'
        )}
      >
        {initials}
      </AvatarFallback>
    </Avatar>
  );
}
