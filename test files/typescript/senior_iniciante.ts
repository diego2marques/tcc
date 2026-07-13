type TaskStatus = 'todo' | 'doing' | 'done' | 'blocked';
type TaskTag = 'critical' | 'customer-facing';

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
type ActorId = number & { readonly __brand: 'ActorId' };
type TaskVersion = number & { readonly __brand: 'TaskVersion' };

type CompletionCommand = Readonly<{
  taskId: TaskId;
  expectedVersion: TaskVersion;
  actorId: ActorId;
}>;

type TaskSnapshot = Readonly<{
  id: TaskId;
  title: string;
  ownerId: number | null;
  status: TaskStatus;
  estimateHours: number;
  version: TaskVersion;
  tags: ReadonlyArray<TaskTag>;
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
  warn(event: string, context: Record<string, unknown>): void;
  info(event: string, context: Record<string, unknown>): void;
}

interface Clock {
  now(): Date;
}

type AuditEntry = {
  entityId: TaskId;
  action: 'task.completed';
  at: string;
  metadata: {
    actorId: ActorId;
    previousStatus: TaskStatus;
    previousVersion: number;
    estimateHours: number;
    tags: ReadonlyArray<TaskTag>;
  };
};

type DomainEvent = Readonly<{
  type: 'task.completed';
  entityId: TaskId;
  occurredAt: string;
  actorId: ActorId;
  payload: Readonly<{
    previousVersion: number;
    nextVersion: number;
  }>;
}>;

type CompletionArtifacts = Readonly<{
  auditEntry: AuditEntry;
  domainEvent: DomainEvent;
}>;

type MonitoringContext = Readonly<{
  taskId: TaskId;
  actorId: ActorId;
  tags: ReadonlyArray<TaskTag>;
  previousVersion: TaskVersion;
  nextVersion?: TaskVersion;
  expectedVersion?: TaskVersion;
  currentVersion?: TaskVersion;
}>;

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
      this.monitoringGateway.warn('task.complete.not_found', { taskId: command.taskId, actorId: command.actorId });
      return { ok: false, error: 'TASK_NOT_FOUND' };
    }

    const validation = this.policy.evaluate(task);
    if (!validation.ok) {
      this.monitoringGateway.warn('task.complete.validation_failed', {
        ...this.createMonitoringContext(task, command.actorId),
        code: validation.error,
      });
      return validation;
    }

    if (task.version !== command.expectedVersion) {
      this.monitoringGateway.warn('task.complete.version_conflict', {
        ...this.createMonitoringContext(task, command.actorId),
        expectedVersion: command.expectedVersion,
        currentVersion: task.version,
      });
      return { ok: false, error: 'VERSION_CONFLICT' };
    }

    const completedAt = this.clock.now().toISOString();
    const updatedTask = this.buildUpdatedTask(task);
    const completionArtifacts = this.buildCompletionArtifacts({
      command,
      task,
      updatedTask,
      completedAt,
    });

    try {
      await this.taskRepository.save(updatedTask);
      await this.publishCompletionArtifacts(completionArtifacts);
    } catch {
      this.monitoringGateway.warn('task.complete.audit_unavailable', {
        ...this.createMonitoringContext(task, command.actorId, updatedTask.version),
      });
      return { ok: false, error: 'AUDIT_UNAVAILABLE' };
    }

    this.monitoringGateway.info('task.complete.succeeded', {
      ...this.createMonitoringContext(task, command.actorId, updatedTask.version),
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

  private buildUpdatedTask(task: TaskSnapshot): TaskSnapshot {
    return {
      ...task,
      status: 'done',
      version: /** @type {TaskVersion} */ (task.version + 1),
    };
  }

  private buildCompletionArtifacts({
    command,
    task,
    updatedTask,
    completedAt,
  }: {
    command: CompletionCommand;
    task: TaskSnapshot;
    updatedTask: TaskSnapshot;
    completedAt: string;
  }): CompletionArtifacts {
    return {
      auditEntry: {
        entityId: updatedTask.id,
        action: 'task.completed',
        at: completedAt,
        metadata: {
          actorId: command.actorId,
          previousStatus: task.status,
          previousVersion: task.version,
          estimateHours: task.estimateHours,
          tags: task.tags,
        },
      },
      domainEvent: {
        type: 'task.completed',
        entityId: updatedTask.id,
        occurredAt: completedAt,
        actorId: command.actorId,
        payload: {
          previousVersion: task.version,
          nextVersion: updatedTask.version,
        },
      },
    };
  }

  private createMonitoringContext(
    task: TaskSnapshot,
    actorId: ActorId,
    nextVersion?: TaskVersion
  ): MonitoringContext {
    return {
      taskId: task.id,
      actorId,
      tags: task.tags,
      previousVersion: task.version,
      ...(nextVersion ? { nextVersion } : {}),
    };
  }

  private async publishCompletionArtifacts(artifacts: CompletionArtifacts): Promise<void> {
    await this.auditGateway.publish(artifacts.auditEntry);
    await this.domainEventBus.publish(artifacts.domainEvent);
  }
}
