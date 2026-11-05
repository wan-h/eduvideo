import { isUndefined, pickBy } from "lodash-es"

export function toFormData(data: object): FormData {
  const fd = new FormData()
  for (const [key, value] of Object.entries(
    pickBy(data, (v) => !isUndefined(v))
  )) {
    if (Array.isArray(value)) {
      for (const item of value) {
        if (item instanceof File) fd.append(key, item)
      }
    } else {
      fd.append(key, value as string | Blob)
    }
  }
  return fd
}
