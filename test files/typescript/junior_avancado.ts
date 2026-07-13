type TaskStatus = 'todo' | 'doing' | 'done';

type Task = {
  id: number;
  title: string;
  ownerId: number | null;
  status: TaskStatus;
};

const tasks: Task[] = [
  { id: 1, title: 'Criar backlog', ownerId: 10, status: 'todo' },
  { id: 2, title: 'Revisar ticket', ownerId: null, status: 'doing' },
];

function findTaskById(taskId: number): Task | undefined {
  return tasks.find((task) => task.id === taskId);
}

function completeTask(taskId: number): { ok: boolean; message: string } {
  const task = findTaskById(taskId);

  if (!task) {
    return { ok: false, message: 'Task nao encontrada' };
  }

  if (task.ownerId === null) {
    return { ok: false, message: 'Task sem responsavel' };
  }

  task.status = 'done';
  return { ok: true, message: 'Task concluida com sucesso' };
}

console.log(completeTask(1));
