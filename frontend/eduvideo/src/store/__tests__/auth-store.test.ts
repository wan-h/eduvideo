import { describe, expect, it } from "vitest"
import { ADMIN_USER, useAuthStore } from "../auth-store"

describe("useAuthStore", () => {
  it("should initialize with default admin user", () => {
    const state = useAuthStore.getState()
    expect(state.userInfo).toEqual(ADMIN_USER)
    expect(state.userInfo.uid).toBe("admin")
    expect(state.userInfo.username).toBe("admin")
  })
})