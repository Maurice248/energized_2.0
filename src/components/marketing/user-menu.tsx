"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { signOut } from "@/lib/auth/client";

type Props = {
  name: string;
  email: string;
  image: string | null;
  isEmployer: boolean;
};

export function UserMenu({ name, email, image, isEmployer }: Props) {
  const router = useRouter();
  const initial = (name?.trim()[0] || email[0] || "?").toUpperCase();
  const displayName = name?.trim() || email.split("@")[0];

  const dashboardHref = isEmployer ? "/employer/profile" : "/dashboard";
  const profileHref = isEmployer ? "/employer/profile" : "/profile";

  const handleSignOut = async () => {
    await signOut();
    router.push("/");
    router.refresh();
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label="Open user menu"
        style={{
          width: 40,
          height: 40,
          borderRadius: "50%",
          border: "1px solid var(--v2-ink-200)",
          background: image ? "transparent" : "var(--v2-ink-950)",
          color: "var(--v2-accent)",
          display: "grid",
          placeItems: "center",
          fontFamily: "var(--v2-font-serif)",
          fontWeight: 900,
          fontSize: 16,
          overflow: "hidden",
          cursor: "pointer",
          padding: 0,
        }}
      >
        {image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={image}
            alt={displayName}
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
        ) : (
          <span>{initial}</span>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" sideOffset={8} className="min-w-56">
        <DropdownMenuLabel>
          <div style={{ fontWeight: 700, fontSize: 14 }}>{displayName}</div>
          <div
            style={{
              fontSize: 12,
              color: "var(--v2-ink-500)",
              fontWeight: 400,
              marginTop: 2,
            }}
          >
            {email}
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href={profileHref}>Profile</Link>
        </DropdownMenuItem>
        {!isEmployer && (
          <DropdownMenuItem asChild>
            <Link href={dashboardHref}>Dashboard</Link>
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => void handleSignOut()}>
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
