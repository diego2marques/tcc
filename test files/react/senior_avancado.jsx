// @ts-check
import { useEffect, useMemo, useReducer, useState } from 'react';

/**
 * @typedef {{ id: number, title: string, status: 'todo' | 'doing' | 'done' | 'blocked', ownerName: string | null, updatedAt: string }} Task
 * @typedef {{ tasks: Task[], loading: boolean, error: string, pendingTaskIds: number[] }} TasksState
 * @typedef {{ type: 'load_started' } | { type: 'load_succeeded', payload: Task[] } | { type: 'load_failed', payload: string } | { type: 'task_started', payload: number } | { type: 'task_completed', payload: number } | { type: 'task_finished', payload: number }} TasksAction
 * @typedef {{ readTasks: () => Promise<Task[]>, completeTask: (taskId: number) => Promise<void> }} TasksGateway
 * @typedef {{ formatEmptyState: (filter: string) => string, formatSummary: (tasks: Task[]) => string, mapLoadError: () => string }} BoardPresentationPolicy
 */

/** @type {TasksState} */
const initialState = {
  tasks: [],
  loading: false,
  error: '',
  pendingTaskIds: [],
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
    case 'task_started':
      return { ...state, pendingTaskIds: [...state.pendingTaskIds, action.payload] };
    case 'task_completed':
      return {
        ...state,
        tasks: state.tasks.map((task) =>
          task.id === action.payload
            ? { ...task, status: 'done', updatedAt: new Date().toISOString() }
            : task
        ),
      };
    case 'task_finished':
      return {
        ...state,
        pendingTaskIds: state.pendingTaskIds.filter((taskId) => taskId !== action.payload),
      };
    default:
      return state;
  }
}

/** @type {TasksGateway} */
const defaultTasksGateway = {
  async readTasks() {
    const response = await fetch('/api/tasks');
    return response.json();
  },
  async completeTask() {
    return undefined;
  },
};

/** @type {BoardPresentationPolicy} */
const defaultPresentationPolicy = {
  formatEmptyState(filter) {
    return filter ? `Nenhuma task encontrada para "${filter}".` : 'Nenhuma task encontrada.';
  },
  formatSummary(tasks) {
    const doneCount = tasks.filter((task) => task.status === 'done').length;
    return `${doneCount} de ${tasks.length} tasks concluidas`;
  },
  mapLoadError() {
    return 'Erro ao carregar tasks';
  },
};

/**
 * @param {{ gateway: TasksGateway, presentationPolicy: BoardPresentationPolicy }} params
 */
function useTasksBoardModel({ gateway, presentationPolicy }) {
  const [state, dispatch] = useReducer(tasksReducer, initialState);

  useEffect(() => {
    let active = true;

    async function loadTasks() {
      dispatch({ type: 'load_started' });

      try {
        const data = await gateway.readTasks();
        if (active) {
          dispatch({ type: 'load_succeeded', payload: data });
        }
      } catch {
        if (active) {
          dispatch({ type: 'load_failed', payload: presentationPolicy.mapLoadError() });
        }
      }
    }

    loadTasks();
    return () => {
      active = false;
    };
  }, [gateway, presentationPolicy]);

  return {
    ...state,
    /**
     * @param {number} taskId
     */
    async completeTask(taskId) {
      dispatch({ type: 'task_started', payload: taskId });

      try {
        await gateway.completeTask(taskId);
        dispatch({ type: 'task_completed', payload: taskId });
      } finally {
        dispatch({ type: 'task_finished', payload: taskId });
      }
    },
  };
}

/**
 * @param {{ gateway?: TasksGateway, presentationPolicy?: BoardPresentationPolicy }} props
 */
export function SeniorAvancadoBoard({
  gateway = defaultTasksGateway,
  presentationPolicy = defaultPresentationPolicy,
}) {
  const [filter, setFilter] = useState('');
  const { tasks, loading, error, pendingTaskIds, completeTask } = useTasksBoardModel({
    gateway,
    presentationPolicy,
  });

  const visibleTasks = useMemo(() => {
    return tasks.filter((task) => task.title.toLowerCase().includes(filter.toLowerCase()));
  }, [tasks, filter]);

  const summary = useMemo(() => {
    return presentationPolicy.formatSummary(tasks);
  }, [presentationPolicy, tasks]);

  const emptyMessage = useMemo(() => {
    return presentationPolicy.formatEmptyState(filter);
  }, [presentationPolicy, filter]);

  return (
    <section>
      <TaskToolbar filter={filter} onFilterChange={setFilter} summary={summary} />
      {loading && <StatusMessage kind="loading" message="Carregando..." />}
      {error && <StatusMessage kind="error" message={error} />}
      <TaskList
        tasks={visibleTasks}
        pendingTaskIds={pendingTaskIds}
        onComplete={completeTask}
        emptyMessage={emptyMessage}
      />
    </section>
  );
}

/**
 * @param {{ filter: string, onFilterChange: (value: string) => void, summary: string }} props
 */
function TaskToolbar({ filter, onFilterChange, summary }) {
  return (
    <header>
      <h1>Tasks</h1>
      <p>{summary}</p>
      <input value={filter} onChange={(event) => onFilterChange(event.target.value)} />
    </header>
  );
}

/**
 * @param {{ tasks: Task[], pendingTaskIds: number[], onComplete: (taskId: number) => Promise<void>, emptyMessage: string }} props
 */
function TaskList({ tasks, pendingTaskIds, onComplete, emptyMessage }) {
  if (tasks.length === 0) {
    return <EmptyState message={emptyMessage} />;
  }

  return tasks.map((task) => {
    const isPending = pendingTaskIds.includes(task.id);

    return (
      <article key={task.id}>
        <strong>{task.title}</strong>
        <span>{task.status}</span>
        <small>{task.updatedAt}</small>
        <button onClick={() => onComplete(task.id)} disabled={task.ownerName === null || isPending}>
          {isPending ? 'Concluindo...' : 'Concluir'}
        </button>
      </article>
    );
  });
}

/**
 * @param {{ message: string }} props
 */
function EmptyState({ message }) {
  return <p>{message}</p>;
}

/**
 * @param {{ kind: 'loading' | 'error', message: string }} props
 */
function StatusMessage({ kind, message }) {
  return <p data-kind={kind}>{message}</p>;
}
