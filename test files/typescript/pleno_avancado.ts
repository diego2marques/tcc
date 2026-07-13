type TaskStatus = 'todo' | 'doing' | 'done' | 'blocked';

type DomainError =
  | 'TASK_NOT_FOUND'
  | 'TASK_WITHOUT_OWNER'
  | 'TASK_BLOCKED'
  | 'INVALID_ESTIMATE';

type Result<T> =
  | { ok: true; data: T }
  | { ok: false; error: DomainError };

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

interface Clock {
  now(): Date;
}

class TaskCompletionPolicy {
  validate(task: Task): Result<Task> {
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

class CompleteTaskUseCase {
  constructor(
    private readonly taskRepository: TaskRepository,
    private readonly auditGateway: AuditGateway,
    private readonly clock: Clock,
    private readonly policy: TaskCompletionPolicy
  ) {}

  async execute(taskId: number): Promise<Result<{ taskId: number; completedAt: string }>> {
    const task = await this.taskRepository.findById(taskId);
    if (!task) {
      return { ok: false, error: 'TASK_NOT_FOUND' };
    }

    const validation = this.policy.validate(task);
    if (!validation.ok) {
      return validation;
    }

    const completedAt = this.clock.now().toISOString();
    const updatedTask = { ...task, status: 'done' as const };

    await this.taskRepository.save(updatedTask);
    await this.auditGateway.publish({
      taskId: updatedTask.id,
      action: 'task.completed',
      at: completedAt,
    });

    return {
      ok: true,
      data: {
        taskId: updatedTask.id,
        completedAt,
      },
    };
  }
}
