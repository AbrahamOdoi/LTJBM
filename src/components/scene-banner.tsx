import { UI_SCENES, type UiSceneKey } from "@/lib/ui-scenes";

type Props = {
  scene: UiSceneKey;
  /** Optional short caption under the image */
  caption?: string;
  className?: string;
  /** Aspect / height treatment */
  density?: "hero" | "strip" | "card";
};

/**
 * Tasteful photography strip for role dashboards / login — solid flat panel, no wash overlays.
 */
export function SceneBanner({
  scene,
  caption,
  className = "",
  density = "strip",
}: Props) {
  const asset = UI_SCENES[scene];
  const frame =
    density === "hero"
      ? "h-44 sm:h-56"
      : density === "card"
        ? "h-28"
        : "h-32 sm:h-36";

  return (
    <figure className={`lt-panel overflow-hidden ${className}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={asset.src}
        alt={asset.alt}
        className={`w-full object-cover ${frame}`}
      />
      {caption ? (
        <figcaption className="border-t border-[var(--lt-line)] px-4 py-2 text-xs text-[var(--lt-muted)]">
          {caption}
        </figcaption>
      ) : null}
    </figure>
  );
}
