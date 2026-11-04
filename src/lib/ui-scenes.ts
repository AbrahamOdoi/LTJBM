/** Local church / Christian scene photography for calm product liveliness (flat UI — no gradients). */
export const UI_SCENES = {
  login: {
    src: "/images/scenes/login.jpg",
    alt: "Church sanctuary with stained-glass windows and pews",
  },
  community: {
    src: "/images/scenes/community.jpg",
    alt: "Church exterior at night with a steeple cross",
  },
  gathering: {
    src: "/images/scenes/gathering.jpg",
    alt: "Congregation gathered for worship",
  },
  hands: {
    src: "/images/scenes/hands.jpg",
    alt: "Church sanctuary altar with a crucifix",
  },
  workspace: {
    src: "/images/scenes/workspace.jpg",
    alt: "Wooden church building with a steeple cross",
  },
  board: {
    src: "/images/scenes/board.jpg",
    alt: "Stained-glass window of a saint holding a crucifix",
  },
  empty: {
    src: "/images/scenes/empty.jpg",
    alt: "Historic church box pews along the aisle",
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
