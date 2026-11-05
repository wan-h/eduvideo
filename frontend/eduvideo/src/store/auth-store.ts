import type { UserInfo } from "@/api/auth"
import { create } from "zustand"

/** 内置默认用户：应用不做登录校验，所有请求以 admin 身份发起 */
export const ADMIN_USER: UserInfo = {
  uid: "admin",
  nickname: "admin",
  username: "admin",
  phone: "",
  email: "",
  created_time: "",
  status: 0,
  avatar_url: "",
  name_confirmed: true,
  role_perms: {},
  orgz_map: {},
  role_ids: null,
  user_type: 0,
  subscribe_chl: [],
}

interface AuthState {
  /** 用户信息（固定为内置 admin 用户） */
  userInfo: UserInfo
}

export const useAuthStore = create<AuthState>(() => ({
  userInfo: ADMIN_USER,
}))