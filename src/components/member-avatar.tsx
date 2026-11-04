import { photoPublicUrl } from "@/lib/members/photos";

type Size = "sm" | "md" | "lg" | "xl";

const sizeClass: Record<Size, string> = {
  sm: "h-9 w-9 text-[11px]",
  md: "h-12 w-12 text-sm",
  lg: "h-16 w-16 text-lg",
  xl: "h-28 w-28 text-2xl",
};

function initials(firstName?: string | null, lastName?: string | null) {
  const a = (firstName ?? "").trim().charAt(0);
  const b = (lastName ?? "").trim().charAt(0);
  const value = `${a}${b}`.toUpperCase();
  return value || "?";
}

type Props = {
  photoKey?: string | null;
  photoUrl?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  size?: Size;
  className?: string;
  alt?: string;
};

/** Member photo or calm initials placeholder — Planning Center–class avatars. */
export function MemberAvatar({
  photoKey,
  photoUrl,
  firstName,
  lastName,
  size = "md",
  className = "",
  alt,
}: Props) {
  const src = photoUrl ?? photoPublicUrl(photoKey);
  const label =
    alt ??
    ([firstName, lastName].filter(Boolean).join(" ") || "Member photo");

  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={label}
        className={`lt-avatar object-cover ${sizeClass[size]} ${className}`}
      />
    );
  }

  return (
    <span
      className={`lt-avatar lt-avatar-empty ${sizeClass[size]} ${className}`}
      aria-label="No photo on file"
      title="No photo on file"
    >
      {initials(firstName, lastName)}
    </span>
  );
}
