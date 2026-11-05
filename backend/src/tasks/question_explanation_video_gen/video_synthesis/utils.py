import os

def get_cpu_count():
    """
    获取容器分配的 CPU 数量，优先使用 Kubernetes 环境变量，
    然后尝试从 cgroup 读取，最后返回默认值 1。
    """
    # 1. 尝试从环境变量获取 CPU 限制
    cpu_limit = os.environ.get('CONTAINER_CPU_LIMIT')
    cpu_request = os.environ.get('CONTAINER_CPU_REQUEST')
    
    # 优先使用限制，如果没有则使用请求
    cpu_value = cpu_limit or cpu_request
    
    if cpu_value:
        try:
            # 处理类似 "500m" 或 "2" 或 "2.5" 的值
            if 'm' in cpu_value:
                # 处理 millicpu (如 500m = 0.5)
                cpu_value = float(cpu_value[:-1]) / 1000
            else:
                cpu_value = float(cpu_value)
            return max(1, int(cpu_value))
        except ValueError:
            pass
    
    # 2. 尝试从 cgroup v1 获取 CPU 限制
    cgroup_v1_cpu_quota = '/sys/fs/cgroup/cpu/cpu.cfs_quota_us'
    cgroup_v1_cpu_period = '/sys/fs/cgroup/cpu/cpu.cfs_period_us'
    
    if os.path.exists(cgroup_v1_cpu_quota) and os.path.exists(cgroup_v1_cpu_period):
        try:
            with open(cgroup_v1_cpu_quota, 'r') as f:
                quota = int(f.read().strip())
            with open(cgroup_v1_cpu_period, 'r') as f:
                period = int(f.read().strip())
            
            if quota > 0:
                return max(1, quota // period)
        except (IOError, ValueError):
            pass
    
    # 3. 尝试从 cgroup v2 获取 CPU 限制
    cgroup_v2_cpu_max = '/sys/fs/cgroup/cpu.max'
    if os.path.exists(cgroup_v2_cpu_max):
        try:
            with open(cgroup_v2_cpu_max, 'r') as f:
                cpu_max = f.read().strip()
            
            if 'max' not in cpu_max:
                quota, period = cpu_max.split()
                quota = int(quota)
                period = int(period)
                return max(1, quota // period)
        except (IOError, ValueError):
            pass
    
    # 4. 如果所有方法都失败，返回默认值 1
    return 1

if __name__ == '__main__':
    print(get_cpu_count())