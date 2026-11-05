import { PRIMARY_FONT_FAMILY } from "../fonts"

export const THEME = {
  colors: {
    chalkWhite: "#f0f0f0",
    chalkYellow: "#ffeb3b",
    pureWhite: "#ffffff",
    tableBorder: "#555",
    tableCellBg: "rgba(34, 34, 34, 0.5)",
    divider: "#e9ecef",
  },
  fontFamily: PRIMARY_FONT_FAMILY,
  textShadow: {
    chalk: `0 1px 2px rgba(0, 0, 0, 0.9), 0 2px 8px rgba(0, 0, 0, 0.6), 0 0 12px rgba(0, 0, 0, 0.3)`,
    title: `0 1px 3px rgba(0, 0, 0, 0.9), 0 2px 8px rgba(0, 0, 0, 0.6)`,
  },
  letterSpacing: "0.5px",
  layout: {
    titleHeight: "6%",
    contentHeight: "84%",
  },
} as const
