import { useResolutionScale } from "../hooks/use-resolution-scale"
import { THEME } from "../styles/theme"

export interface TitleBarProps {
  label: string
}

export function TitleBar({ label }: TitleBarProps) {
  const scale = useResolutionScale()

  return (
    <div
      style={{
        height: THEME.layout.titleHeight,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: THEME.colors.pureWhite,
        fontSize: 16 * scale,
        fontWeight: 600,
        letterSpacing: `${3 * scale}px`,
        textTransform: "uppercase",
        textShadow: THEME.textShadow.title,
        marginBottom: 12 * scale,
      }}
    >
      {label}
    </div>
  )
}
