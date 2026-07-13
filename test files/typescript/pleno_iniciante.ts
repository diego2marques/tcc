type TaskStatus = 'todo' | 'doing' | 'done' | 'blocked';

type Result<T> =
  | { ok: true; data: T }
  | { ok: false; error: string };

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

class InMemoryTaskRepository implements TaskRepository {
  private readonly tasks = new Map<number, Task>([
    [1, { id: 1, title: 'Criar backlog', ownerId: 10, status: 'todo', estimateHours: 4 }],
    [2, { id: 2, title: 'Revisar ticket', ownerId: 15, status: 'doing', estimateHours: 2 }],
  ]);

  async findById(id: number): Promise<Task | null> {
    return this.tasks.get(id) ?? null;
  }

  async save(task: Task): Promise<Task> {
    this.tasks.set(task.id, task);
    return task;
  }
}

class TaskWorkflowService {
  constructor(private readonly taskRepository: TaskRepository) {}

  async moveToDone(taskId: number): Promise<Result<Task>> {
    const task = await this.taskRepository.findById(taskId);

    if (!task) {
      return { ok: false, error: 'TASK_NOT_FOUND' };
    }

    if (task.ownerId === null) {
      return { ok: false, error: 'TASK_WITHOUT_OWNER' };
    }

    if (task.estimateHours <= 0) {
      return { ok: false, error: 'INVALID_ESTIMATE' };
    }

    const updatedTask = { ...task, status: 'done' as const };
    await this.taskRepository.save(updatedTask);
    return { ok: true, data: updatedTask };
  }
}

async function run(): Promise<void> {
  const service = new TaskWorkflowService(new InMemoryTaskRepository());
  console.log(await service.moveToDone(1));
}

run();
