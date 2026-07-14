export const themes = {
  dark: {
    canvas: "#12161c",
    surface: "#1a2028",
    text: "#f1f1ec",
    textMuted: "#aeb7be",
    border: "#394550",
    accent: "#8fb8d3",
  },
  light: {
    canvas: "#f3f1eb",
    surface: "#fbfaf6",
    text: "#182028",
    textMuted: "#57636d",
    border: "#c5ccd0",
    accent: "#315d7c",
  },
} as const;

export type ThemeName = keyof typeof themes;

export * from "./palette";
export * from "./dtcg";
