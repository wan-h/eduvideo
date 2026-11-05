import {
  Clapperboard,
  Film,
  MonitorPlay,
  Music,
  Sparkles,
  Wand2,
} from "lucide-react"

export function StudioBackground() {
  return (
    <div
      className="pointer-events-none absolute inset-0 overflow-hidden"
      aria-hidden="true"
    >
      {/* 波浪线 1 — brand 色，最底部，向上凸，最粗 */}
      <svg
        className="absolute bottom-0 h-8 w-[200%] motion-safe:animate-[wave-scroll_10s_linear_infinite]"
        viewBox="0 0 2880 32"
        preserveAspectRatio="none"
      >
        <path
          d="M0,16 Q360,4 720,16 T1440,16 T2160,16 T2880,16"
          stroke="var(--brand)"
          strokeWidth="2"
          fill="none"
          opacity="0.15"
        />
      </svg>

      {/* 波浪线 2 — 粉紫色，向下凹 */}
      <svg
        className="absolute bottom-6 h-8 w-[200%] motion-safe:animate-[wave-scroll_12s_linear_infinite]"
        viewBox="0 0 2880 32"
        preserveAspectRatio="none"
      >
        <path
          d="M0,16 Q360,28 720,16 T1440,16 T2160,16 T2880,16"
          stroke="var(--glow-accent-1)"
          strokeWidth="1.5"
          fill="none"
          opacity="0.12"
        />
      </svg>

      {/* 波浪线 3 — 蓝青色，密波，向上凸 */}
      <svg
        className="absolute bottom-10 h-8 w-[200%] motion-safe:animate-[wave-scroll_8s_linear_infinite]"
        viewBox="0 0 2880 32"
        preserveAspectRatio="none"
      >
        <path
          d="M0,16 Q180,6 360,16 T720,16 T1080,16 T1440,16 T1800,16 T2160,16 T2520,16 T2880,16"
          stroke="var(--glow-accent-2)"
          strokeWidth="1"
          fill="none"
          opacity="0.10"
        />
      </svg>

      {/* 波浪线 4 — brand 色，疏波，向下凹，最细 */}
      <svg
        className="absolute bottom-14 h-8 w-[200%] motion-safe:animate-[wave-scroll_14s_linear_infinite]"
        viewBox="0 0 2880 32"
        preserveAspectRatio="none"
      >
        <path
          d="M0,16 Q540,24 1080,16 T2160,16 T2880,16"
          stroke="var(--brand)"
          strokeWidth="0.8"
          fill="none"
          opacity="0.08"
        />
      </svg>

      {/* 图标 1 — Sparkles，右下偏中 */}
      <div className="absolute right-[30%] bottom-20 opacity-[0.08] motion-safe:animate-[float-gentle_5s_ease-in-out_infinite] dark:opacity-[0.12]">
        <Sparkles className="size-20" strokeWidth={0.8} />
      </div>

      {/* 图标 2 — Film，右下 */}
      <div
        className="absolute right-10 bottom-24 opacity-[0.07] motion-safe:animate-[float-gentle_6s_ease-in-out_infinite] dark:opacity-[0.11]"
        style={{ animationDelay: "1.5s" }}
      >
        <Film className="size-24" strokeWidth={0.8} />
      </div>

      {/* 图标 3 — Clapperboard，中下 */}
      <div
        className="absolute right-[45%] bottom-28 opacity-[0.06] motion-safe:animate-[float-gentle_4.5s_ease-in-out_infinite] dark:opacity-[0.10]"
        style={{ animationDelay: "0.8s" }}
      >
        <Clapperboard className="size-16" strokeWidth={0.8} />
      </div>

      {/* 图标 4 — Wand2，中下偏右 */}
      <div
        className="absolute right-[20%] bottom-[6.5rem] opacity-[0.06] motion-safe:animate-[float-gentle_5.5s_ease-in-out_infinite] dark:opacity-[0.09]"
        style={{ animationDelay: "2.2s" }}
      >
        <Wand2 className="size-14" strokeWidth={0.8} />
      </div>

      {/* 图标 5 — MonitorPlay，右中上 */}
      <div
        className="absolute right-[38%] bottom-36 opacity-[0.05] motion-safe:animate-[float-gentle_7s_ease-in-out_infinite] dark:opacity-[0.08]"
        style={{ animationDelay: "3s" }}
      >
        <MonitorPlay className="size-14" strokeWidth={0.8} />
      </div>

      {/* 图标 6 — Music，右中 */}
      <div
        className="absolute right-[15%] bottom-[9rem] opacity-[0.05] motion-safe:animate-[float-gentle_6.5s_ease-in-out_infinite] dark:opacity-[0.08]"
        style={{ animationDelay: "1.2s" }}
      >
        <Music className="size-14" strokeWidth={0.8} />
      </div>
    </div>
  )
}
