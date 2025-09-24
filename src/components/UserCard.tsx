import Image from "next/image";
import sballandoNoPhoto from "~/images/sballando_no_photo.jpeg";
import type { User } from "~/types";

interface UserCardProps {
  user: User;
  className?: string;
}

export function UserCard({ user, className = "" }: UserCardProps) {
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <div className="relative w-10 h-10 rounded-full overflow-hidden">
        <Image
          src={user.picture || sballandoNoPhoto}
          alt={user.name || 'User'}
          fill
          className="object-cover"
        />
      </div>
      <div>
        <p className="text-white font-medium">
          {user.name} {user.surname}
        </p>
        <p className="text-white/60 text-sm">{user.email}</p>
        {user.nickname && (
          <p className="text-white/60 text-xs">@{user.nickname}</p>
        )}
      </div>
    </div>
  );
}