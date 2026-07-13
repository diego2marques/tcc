// @ts-check
import { useEffect, useMemo, useReducer, useState } from 'react';

/**
 * @typedef {{ id: number, title: string, status: 'todo' | 'doing' | 'done' | 'blocked', ownerName: string | null }} Task
 * @typedef {{ tasks: Task[], loading: boolean, error: string }} TasksState
 * @typedef {{ type: 'load_started' } | { type: 'load_succeeded', payload: Task[] } | { type: 'load_failed', payload: string } | { type: 'task_completed', payload: number }} TasksAction
 */

/** @type {TasksState} */
const initialState = {
  tasks: [],
  loading: false,
  error: '',
};

/**
 * @param {TasksState} state
 * @param {TasksAction} action
 * @returns {TasksState}
 */
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

/**
 * @returns {Promise<Task[]>}
 */
async function defaultTaskLoader() {
  const response = await fetch('/api/tasks');
  return response.json();
}

/**
 * @param {() => Promise<Task[]>} taskLoader
 */
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
    /**
     * @param {number} taskId
     */
    completeTask(taskId) {
      dispatch({ type: 'task_completed', payload: taskId });
    },
  };
}

/**
 * @param {{ taskLoader?: () => Promise<Task[]> }} props
 */
export function PlenoInicianteBoard({ taskLoader = defaultTaskLoader }) {
  const [filter, setFilter] = useState('');
  const { tasks, loading, error, completeTask } = useTasks(taskLoader);

  const visibleTasks = useMemo(() => {
    return tasks.filter((task) => task.title.toLowerCase().includes(filter.toLowerCase()));
  }, [tasks, filter]);

  return (
    <section>
      <TaskToolbar filter={filter} onFilterChange={setFilter} />
      {loading && <StatusMessage message="Carregando..." />}
      {error && <StatusMessage message={error} />}
      <TaskList tasks={visibleTasks} onComplete={completeTask} />
    </section>
  );
}

/**
 * @param {{ filter: string, onFilterChange: (value: string) => void }} props
 */
function TaskToolbar({ filter, onFilterChange }) {
  return (
    <header>
      <h1>Tasks</h1>
      <input value={filter} onChange={(event) => onFilterChange(event.target.value)} />
    </header>
  );
}

/**
 * @param {{ tasks: Task[], onComplete: (taskId: number) => void }} props
 */
function TaskList({ tasks, onComplete }) {
  return tasks.map((task) => (
    <article key={task.id}>
      <strong>{task.title}</strong>
      <span>{task.status}</span>
      <button onClick={() => onComplete(task.id)} disabled={task.ownerName === null}>
        Concluir
      </button>
    </article>
  ));
}

/**
 * @param {{ message: string }} props
 */
function StatusMessage({ message }) {
  return <p>{message}</p>;
}
