export type TaskStatus = "pending" | "processing" | "completed" | "failed"

/** API TASK_STATUS → TaskStatus 映射 */
export const API_STATUS_MAP: Record<number, TaskStatus> = {
  0: "pending",
  1: "processing",
  2: "processing",
  3: "pending",
  4: "processing",
  10: "completed",
  20: "failed",
  30: "failed",
}
