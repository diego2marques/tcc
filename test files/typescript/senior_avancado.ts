type TaskStatus = 'todo' | 'doing' | 'done' | 'blocked';
type TaskTag = 'critical' | 'customer-facing' | 'billing-sensitive';

type CompleteTaskFailure =
  | 'TASK_NOT_FOUND'
  | 'TASK_WITHOUT_OWNER'
  | 'TASK_BLOCKED'
  | 'INVALID_ESTIMATE'
  | 'VERSION_CONFLICT'
  | 'AUDIT_UNAVAILABLE';

type Result<T, E extends string> =
  | { ok: true; data: T }
  | { ok: false; error: E };

type TaskId = number & { readonly __brand: 'TaskId' };

type CompletionCommand = Readonly<{
  taskId: TaskId;
  expectedVersion: number;
  actorId: number;
}>;

type TaskSnapshot = Readonly<{
  id: TaskId;
  title: string;
  ownerId: number | null;
  status: TaskStatus;
  estimateHours: number;
  version: number;
  tags: ReadonlyArray<TaskTag>;
}>;

type DomainEvent = Readonly<{
  type: 'task.completed';
  entityId: TaskId;
  occurredAt: string;
  actorId: number;
}>;

interface TaskRepository {
  findById(id: TaskId): Promise<TaskSnapshot | null>;
  save(task: TaskSnapshot): Promise<TaskSnapshot>;
}

interface AuditGateway {
  publish(entry: AuditEntry): Promise<void>;
}

interface DomainEventBus {
  publish(event: DomainEvent): Promise<void>;
}

interface MonitoringGateway {
  info(event: string, context: Record<string, unknown>): void;
  warn(event: string, context: Record<string, unknown>): void;
}

interface Clock {
  now(): Date;
}

type AuditEntry = {
  entityId: TaskId;
  action: 'task.completed';
  at: string;
  metadata: {
    actorId: number;
    previousStatus: TaskStatus;
    estimateHours: number;
    previousVersion: number;
    tags: ReadonlyArray<TaskTag>;
  };
};

class TaskCompletionPolicy {
  evaluate(
    task: TaskSnapshot
  ): Result<TaskSnapshot, Extract<CompleteTaskFailure, 'TASK_WITHOUT_OWNER' | 'TASK_BLOCKED' | 'INVALID_ESTIMATE'>> {
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
    private readonly domainEventBus: DomainEventBus,
    private readonly monitoringGateway: MonitoringGateway,
    private readonly clock: Clock,
    private readonly policy: TaskCompletionPolicy
  ) {}

  async execute(
    command: CompletionCommand
  ): Promise<Result<{ taskId: TaskId; completedAt: string; nextVersion: number }, CompleteTaskFailure>> {
    const task = await this.taskRepository.findById(command.taskId);
    if (!task) {
      this.monitoringGateway.warn('task.complete.not_found', {
        taskId: command.taskId,
        actorId: command.actorId,
      });
      return { ok: false, error: 'TASK_NOT_FOUND' };
    }

    const validation = this.policy.evaluate(task);
    if (!validation.ok) {
      this.monitoringGateway.warn('task.complete.validation_failed', {
        taskId: command.taskId,
        actorId: command.actorId,
        code: validation.error,
        tags: task.tags,
      });
      return validation;
    }

    if (task.version !== command.expectedVersion) {
      this.monitoringGateway.warn('task.complete.version_conflict', {
        taskId: task.id,
        actorId: command.actorId,
        expectedVersion: command.expectedVersion,
        currentVersion: task.version,
        tags: task.tags,
      });
      return { ok: false, error: 'VERSION_CONFLICT' };
    }

    const completedAt = this.clock.now().toISOString();
    const updatedTask: TaskSnapshot = {
      ...task,
      status: 'done',
      version: task.version + 1,
    };

    try {
      await this.taskRepository.save(updatedTask);
      await this.auditGateway.publish({
        entityId: updatedTask.id,
        action: 'task.completed',
        at: completedAt,
        metadata: {
          actorId: command.actorId,
          previousStatus: task.status,
          estimateHours: task.estimateHours,
          previousVersion: task.version,
          tags: task.tags,
        },
      });
      await this.domainEventBus.publish({
        type: 'task.completed',
        entityId: updatedTask.id,
        occurredAt: completedAt,
        actorId: command.actorId,
      });
    } catch {
      this.monitoringGateway.warn('task.complete.side_effect_unavailable', {
        taskId: task.id,
        actorId: command.actorId,
        previousVersion: task.version,
        tags: task.tags,
      });
      return { ok: false, error: 'AUDIT_UNAVAILABLE' };
    }

    this.monitoringGateway.info('task.complete.succeeded', {
      taskId: updatedTask.id,
      actorId: command.actorId,
      nextVersion: updatedTask.version,
      tags: updatedTask.tags,
    });

    return {
      ok: true,
      data: {
        taskId: updatedTask.id,
        completedAt,
        nextVersion: updatedTask.version,
      },
    };
  }
}
