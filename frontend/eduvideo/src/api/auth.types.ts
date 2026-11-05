/** 单条权限 */
export interface Permission {
  id: number
  key: string
  name: string
  is_page_level: boolean
  owned_by_id: number
  is_default: boolean
  father_name: string
  immutable: boolean
  status: number
}

/** 单个角色的权限集 */
export interface RolePerms {
  role_id: number
  orgz_uid: string
  permissions: Permission[]
}

/** 用户信息 */
export interface UserInfo {
  uid: string
  nickname: string
  username: string
  phone: string
  email: string
  created_time: string
  status: number
  avatar_url: string
  name_confirmed: boolean
  role_perms: Record<string, RolePerms>
  orgz_map: Record<string, string>
  role_ids: number[] | null
  user_type: number
  subscribe_chl: number[]
}
