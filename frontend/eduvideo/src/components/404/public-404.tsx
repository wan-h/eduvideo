import { Button } from "@/components/ui/button"
import { Link } from "react-router"

export function Public404() {
  return (
    <section className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-4">
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
          <div className="h-[600px] w-[600px] rounded-full border border-border/20 opacity-50" />
          <div className="absolute inset-0 -z-10 h-[500px] w-[500px] rounded-full border border-border/10" />
          <div className="absolute inset-0 -z-20 h-[400px] w-[400px] rounded-full border border-border/5" />
        </div>

        <div className="absolute top-[25%] left-[15%] h-1.5 w-1.5 rounded-full bg-brand/30" />
        <div className="absolute top-[20%] left-[80%] h-1 w-1 rounded-full bg-brand/20" />
        <div className="absolute top-[70%] left-[70%] h-2 w-2 rounded-full bg-brand/15" />
        <div className="absolute top-[65%] left-[25%] h-1 w-1 rounded-full bg-brand/25" />
      </div>

      <div className="flex flex-col items-center text-center">
        <div className="relative">
          <span
            aria-hidden="true"
            className="block font-sans text-[12rem] leading-none font-bold tracking-tight text-brand/10 select-none"
          >
            404
          </span>
          <span className="absolute inset-0 flex items-center justify-center font-sans text-[clamp(4rem,15vw,10rem)] leading-none font-bold tracking-tight text-foreground">
            404
          </span>
        </div>

        <div className="mt-6 max-w-md space-y-3">
          <h1 className="font-sans text-xl font-semibold tracking-tight text-foreground">
            页面找不到了
          </h1>
          <p className="font-sans text-sm leading-relaxed text-muted-foreground">
            你访问的页面可能已被移除、更名或暂时不可用。
          </p>
        </div>

        <div className="mt-8">
          <Button variant="brand" size="lg" asChild>
            <Link to="/">返回首页</Link>
          </Button>
        </div>
      </div>
    </section>
  )
}
