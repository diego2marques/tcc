type Task = {
  id: number;
  title: string;
  done: boolean;
  owner?: string;
};

const tasks: Task[] = [
  { id: 1, title: 'Criar backlog', done: false, owner: 'ana' },
  { id: 2, title: 'Revisar ticket', done: true },
];

function findTask(id: any) {
  for (let i = 0; i < tasks.length; i += 1) {
    if (tasks[i].id == id) {
      return tasks[i];
    }
  }

  return null;
}

function completeTask(id: any, owner: any) {
  const task = findTask(id);

  if (task == null) {
    return { ok: false, message: 'Task nao encontrada' };
  }

  if (owner) {
    task.owner = owner;
  }

  task.done = true;
  console.log('Task finalizada', task.title);
  return { ok: true, task: task };
}

function reopenTask(id: any) {
  const task = findTask(id);

  if (task != null) {
    task.done = false;
    return task;
  }

  return null;
}

completeTask('1', 'bruno');
reopenTask(2);
