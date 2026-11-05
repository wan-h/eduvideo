import { render, screen } from "@testing-library/react"
import { MemoryRouter } from "react-router"
import { describe, expect, it } from "vitest"
import { BreadcrumbNav } from "../breadcrumb-nav"

describe("BreadcrumbNav", () => {
  it("renders breadcrumb items correctly", () => {
    render(
      <MemoryRouter>
        <BreadcrumbNav
          items={[
            { label: "视频生成", path: "/" },
            { label: "我的项目", path: "/projects" },
            { label: "立体几何综合题" },
          ]}
        />
      </MemoryRouter>
    )

    expect(screen.getByText("视频生成")).toBeTruthy()
    expect(screen.getByText("我的项目")).toBeTruthy()
    expect(screen.getByText("立体几何综合题")).toBeTruthy()
  })

  it("applies min-w-0 and truncate classes for responsive title display", () => {
    const { container } = render(
      <MemoryRouter>
        <BreadcrumbNav
          items={[
            { label: "视频生成", path: "/" },
            { label: "超长项目名称" },
          ]}
        />
      </MemoryRouter>
    )

    const list = container.querySelector("ol")
    expect(list?.className).toContain("flex-nowrap")
    expect(list?.className).toContain("overflow-hidden")

    const pageItem = screen.getByText("超长项目名称")
    expect(pageItem.className).toContain("truncate")
  })
})
