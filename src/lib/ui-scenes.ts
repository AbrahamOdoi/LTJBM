/** Local Unsplash scene photography for calm product liveliness (flat UI — no gradients). */
export const UI_SCENES = {
  login: {
    src: "/images/scenes/login.jpg",
    alt: "Sunlit church sanctuary pews",
  },
  community: {
    src: "/images/scenes/community.jpg",
    alt: "People gathered in community",
  },
  gathering: {
    src: "/images/scenes/gathering.jpg",
    alt: "Friends sharing a meal together",
  },
  hands: {
    src: "/images/scenes/hands.jpg",
    alt: "Hands joined in fellowship",
  },
  workspace: {
    src: "/images/scenes/workspace.jpg",
    alt: "Quiet office workspace",
  },
  board: {
    src: "/images/scenes/board.jpg",
    alt: "Leadership team meeting around a table",
  },
  empty: {
    src: "/images/scenes/empty.jpg",
    alt: "Quiet church interior",
  },
} as const;

export type UiSceneKey = keyof typeof UI_SCENES;

export function sceneForSurface(
  surface: "home" | "members" | "finance" | "reports" | "admin",
): (typeof UI_SCENES)[UiSceneKey] {
  switch (surface) {
    case "members":
      return UI_SCENES.community;
    case "finance":
      return UI_SCENES.hands;
    case "reports":
      return UI_SCENES.board;
    case "admin":
      return UI_SCENES.workspace;
    default:
      return UI_SCENES.gathering;
  }
}
