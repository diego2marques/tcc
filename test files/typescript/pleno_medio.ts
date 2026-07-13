type TaskStatus = 'todo' | 'doing' | 'done' | 'blocked';

type Result<T, E extends string> =
  | { ok: true; data: T }
  | { ok: false; error: E };

interface Task {
  id: number;
  title: string;
  ownerId: number | null;
  status: TaskStatus;
  estimateHours: number;
}

interface TaskRepository {
  findById(id: number): Promise<Task | null>;
  save(task: Task): Promise<Task>;
}

interface AuditGateway {
  publish(entry: { taskId: number; action: string; at: string }): Promise<void>;
}

class TaskPolicy {
  canBeCompleted(task: Task): Result<Task, 'TASK_WITHOUT_OWNER' | 'TASK_BLOCKED' | 'INVALID_ESTIMATE'> {
    if (task.ownerId === null) {
      return { ok: false, error: 'TASK_WITHOUT_OWNER' };
    }

    if (task.status === 'blocked') {
      return { ok: false, error: 'TASK_BLOCKED' };
    }

    if (task.estimateHours <= 0) {
      return { ok: false, error: 'INVALID_ESTIMATE' };
    }

    return { ok: true, data: task };
  }
}

class TaskCompletionService {
  constructor(
    private readonly taskRepository: TaskRepository,
    private readonly auditGateway: AuditGateway,
    private readonly taskPolicy: TaskPolicy
  ) {}

  async execute(taskId: number): Promise<Result<Task, 'TASK_NOT_FOUND' | 'TASK_WITHOUT_OWNER' | 'TASK_BLOCKED' | 'INVALID_ESTIMATE'>> {
    const task = await this.taskRepository.findById(taskId);
    if (!task) {
      return { ok: false, error: 'TASK_NOT_FOUND' };
    }

    const policyResult = this.taskPolicy.canBeCompleted(task);
    if (!policyResult.ok) {
      return policyResult;
    }

    const updatedTask = { ...task, status: 'done' as const };
    await this.taskRepository.save(updatedTask);
    await this.auditGateway.publish({
      taskId: updatedTask.id,
      action: 'task.completed',
      at: new Date().toISOString(),
    });

    return { ok: true, data: updatedTask };
  }
}
