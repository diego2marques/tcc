type TaskStatus = 'todo' | 'doing' | 'done';

type Task = {
  id: number;
  title: string;
  owner: string | null;
  status: TaskStatus;
};

const tasks: Task[] = [
  { id: 1, title: 'Criar backlog', owner: 'ana', status: 'todo' },
  { id: 2, title: 'Revisar ticket', owner: null, status: 'doing' },
];

function getTaskById(id: number): Task | null {
  return tasks.find((task) => task.id === id) ?? null;
}

function moveTask(id: number, status: TaskStatus): { ok: boolean; message: string } {
  const task = getTaskById(id);

  if (!task) {
    return { ok: false, message: 'Task nao encontrada' };
  }

  if (status === 'done' && !task.owner) {
    return { ok: false, message: 'Task precisa ter responsavel antes de concluir' };
  }

  task.status = status;
  return { ok: true, message: `Task ${task.title} movida para ${status}` };
}

function assignTask(id: number, owner: string): Task | null {
  const task = getTaskById(id);

  if (!task) {
    return null;
  }

  task.owner = owner.trim();
  return task;
}

assignTask(2, 'bruno');
console.log(moveTask(2, 'done'));
