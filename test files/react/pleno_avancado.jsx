import { useEffect, useMemo, useReducer, useState } from 'react';

const initialState = {
  tasks: [],
  loading: false,
  error: '',
};

function tasksReducer(state, action) {
  switch (action.type) {
    case 'load_started':
      return { ...state, loading: true, error: '' };
    case 'load_succeeded':
      return { ...state, loading: false, tasks: action.payload };
    case 'load_failed':
      return { ...state, loading: false, error: action.payload };
    case 'task_completed':
      return {
        ...state,
        tasks: state.tasks.map((task) =>
          task.id === action.payload ? { ...task, status: 'done' } : task
        ),
      };
    default:
      return state;
  }
}

function useTasks(taskLoader) {
  const [state, dispatch] = useReducer(tasksReducer, initialState);

  useEffect(() => {
    let active = true;

    async function loadTasks() {
      dispatch({ type: 'load_started' });

      try {
        const data = await taskLoader();
        if (active) {
          dispatch({ type: 'load_succeeded', payload: data });
        }
      } catch {
        if (active) {
          dispatch({ type: 'load_failed', payload: 'Erro ao carregar tasks' });
        }
      }
    }

    loadTasks();
    return () => {
      active = false;
    };
  }, [taskLoader]);

  return {
    ...state,
    completeTask(taskId) {
      dispatch({ type: 'task_completed', payload: taskId });
    },
  };
}

function TaskList({ tasks, onComplete }) {
  return tasks.map((task) => (
    <article key={task.id}>
      <strong>{task.title}</strong>
      <span>{task.status}</span>
      <button onClick={() => onComplete(task.id)}>Concluir</button>
    </article>
  ));
}

export function PlenoAvancadoBoard({ taskLoader = defaultTaskLoader }) {
  const [filter, setFilter] = useState('');
  const { tasks, loading, error, completeTask } = useTasks(taskLoader);

  const visibleTasks = useMemo(() => {
    return tasks.filter((task) => task.title.toLowerCase().includes(filter.toLowerCase()));
  }, [tasks, filter]);

  return (
    <section>
      <h1>Tasks</h1>
      <input value={filter} onChange={(event) => setFilter(event.target.value)} />
      {loading && <p>Carregando...</p>}
      {error && <p>{error}</p>}
      <TaskList tasks={visibleTasks} onComplete={completeTask} />
    </section>
  );
}

async function defaultTaskLoader() {
  const response = await fetch('/api/tasks');
  return response.json();
}
