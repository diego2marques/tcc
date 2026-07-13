// @ts-check
import { memo, startTransition, useDeferredValue, useEffect, useMemo, useReducer, useRef, useState } from 'react';

/**
 * @typedef {'todo' | 'doing' | 'done' | 'blocked'} TaskStatus
 * @typedef {'critical' | 'customer-facing' | 'billing-sensitive'} TaskTag
 * @typedef {{ id: number, title: string, ownerName: string | null, status: TaskStatus, version: number, updatedAt: string, tags: TaskTag[] }} Task
 * @typedef {{ requestToken: number, loading: boolean, loadError: string, lastSyncAt: string, tasksById: Record<number, Task>, orderedIds: number[], pendingCommands: Record<number, { previousTask: Task, expectedVersion: number }> }} BoardState
 * @typedef {{ readTasks: (signal: AbortSignal) => Promise<Task[]>, completeTask: (taskId: number, expectedVersion: number) => Promise<{ completedAt: string }> }} TasksGateway
 * @typedef {{ formatSummary: (tasks: Task[]) => string, formatEmptyState: (filter: string) => string, formatLastSync: (lastSyncAt: string) => string, mapLoadError: () => string, mapCompletionError: () => string }} BoardPresentationPolicy
 * @typedef {{ type: 'load_started', payload: { requestToken: number } } | { type: 'load_succeeded', payload: { requestToken: number, tasks: Task[], syncedAt: string } } | { type: 'load_failed', payload: { requestToken: number, message: string } } | { type: 'completion_started', payload: { taskId: number, optimisticAt: string, expectedVersion: number } } | { type: 'completion_succeeded', payload: { taskId: number, completedAt: string } } | { type: 'completion_reverted', payload: { taskId: number, reason: string } }} BoardAction
 */

/** @type {BoardState} */
const initialState = {
  requestToken: 0,
  loading: false,
  loadError: '',
  lastSyncAt: '',
  tasksById: {},
  orderedIds: [],
  pendingCommands: {},
};

/**
 * @param {Task[]} tasks
 */
function normalizeTasks(tasks) {
  return tasks.reduce(
    (accumulator, task) => {
      accumulator.tasksById[task.id] = task;
      accumulator.orderedIds.push(task.id);
      return accumulator;
    },
    /** @type {{ tasksById: Record<number, Task>, orderedIds: number[] }} */ ({
      tasksById: {},
      orderedIds: [],
    })
  );
}

function isTaskCompletable(task) {
  return task.ownerName !== null && task.status !== 'blocked';
}

/**
 * @param {BoardState} state
 * @param {BoardAction} action
 * @returns {BoardState}
 */
function boardReducer(state, action) {
  switch (action.type) {
    case 'load_started':
      return { ...state, loading: true, loadError: '', requestToken: action.payload.requestToken };
    case 'load_succeeded': {
      if (action.payload.requestToken !== state.requestToken) {
        return state;
      }

      const normalized = normalizeTasks(action.payload.tasks);
      return {
        ...state,
        loading: false,
        lastSyncAt: action.payload.syncedAt,
        ...normalized,
      };
    }
    case 'load_failed':
      if (action.payload.requestToken !== state.requestToken) {
        return state;
      }

      return { ...state, loading: false, loadError: action.payload.message };
    case 'completion_started': {
      const currentTask = state.tasksById[action.payload.taskId];
      if (!currentTask) {
        return state;
      }

      return {
        ...state,
        pendingCommands: {
          ...state.pendingCommands,
          [currentTask.id]: {
            previousTask: currentTask,
            expectedVersion: action.payload.expectedVersion,
          },
        },
        tasksById: {
          ...state.tasksById,
          [currentTask.id]: {
            ...currentTask,
            status: 'done',
            version: currentTask.version + 1,
            updatedAt: action.payload.optimisticAt,
          },
        },
      };
    }
    case 'completion_succeeded': {
      const currentTask = state.tasksById[action.payload.taskId];
      if (!currentTask) {
        return state;
      }

      const nextPendingCommands = { ...state.pendingCommands };
      delete nextPendingCommands[action.payload.taskId];

      return {
        ...state,
        pendingCommands: nextPendingCommands,
        tasksById: {
          ...state.tasksById,
          [currentTask.id]: { ...currentTask, updatedAt: action.payload.completedAt },
        },
      };
    }
    case 'completion_reverted': {
      const pendingCommand = state.pendingCommands[action.payload.taskId];
      if (!pendingCommand) {
        return state;
      }

      const nextPendingCommands = { ...state.pendingCommands };
      delete nextPendingCommands[action.payload.taskId];

      return {
        ...state,
        pendingCommands: nextPendingCommands,
        loadError: action.payload.reason,
        tasksById: {
          ...state.tasksById,
          [pendingCommand.previousTask.id]: pendingCommand.previousTask,
        },
      };
    }
    default:
      return state;
  }
}

/** @type {TasksGateway} */
const defaultTasksGateway = {
  async readTasks(signal) {
    const response = await fetch('/api/tasks', { signal });
    return response.json();
  },
  async completeTask(_taskId, _expectedVersion) {
    return { completedAt: new Date().toISOString() };
  },
};

/** @type {BoardPresentationPolicy} */
const defaultPresentationPolicy = {
  formatSummary(tasks) {
    const doneCount = tasks.filter((task) => task.status === 'done').length;
    const blockedCount = tasks.filter((task) => task.status === 'blocked').length;
    return `${doneCount} concluidas, ${blockedCount} bloqueadas, ${tasks.length} no total`;
  },
  formatEmptyState(filter) {
    return filter ? `Nenhuma task encontrada para "${filter}".` : 'Nenhuma task encontrada.';
  },
  formatLastSync(lastSyncAt) {
    return lastSyncAt ? `Ultima sincronizacao: ${lastSyncAt}` : 'Sem sincronizacao';
  },
  mapLoadError() {
    return 'Erro ao carregar tasks';
  },
  mapCompletionError() {
    return 'Nao foi possivel concluir a task';
  },
};

/**
 * @param {{ gateway: TasksGateway, presentationPolicy: BoardPresentationPolicy, telemetry?: (eventName: string, payload: Record<string, unknown>) => void }} params
 */
function useSeniorBoard({ gateway, presentationPolicy, telemetry }) {
  const [state, dispatch] = useReducer(boardReducer, initialState);
  const requestRef = useRef(0);

  useEffect(() => {
    const controller = new AbortController();
    const requestToken = requestRef.current + 1;
    requestRef.current = requestToken;

    dispatch({ type: 'load_started', payload: { requestToken } });

    gateway.readTasks(controller.signal)
      .then((tasks) => {
        const syncedAt = new Date().toISOString();
        telemetry?.('tasks.load.succeeded', {
          requestToken,
          syncedAt,
          count: tasks.length,
        });
        dispatch({
          type: 'load_succeeded',
          payload: { requestToken, tasks, syncedAt },
        });
      })
      .catch((error) => {
        if (controller.signal.aborted) {
          return;
        }

        telemetry?.('tasks.load.failed', {
          requestToken,
          message: error instanceof Error ? error.message : 'unexpected_error',
        });
        dispatch({
          type: 'load_failed',
          payload: { requestToken, message: presentationPolicy.mapLoadError() },
        });
      });

    return () => controller.abort();
  }, [gateway, presentationPolicy, telemetry]);

  return {
    ...state,
    async completeTask(taskId) {
      const task = state.tasksById[taskId];
      if (!task) {
        telemetry?.('tasks.complete.not_found', { taskId });
        return;
      }

      if (!isTaskCompletable(task)) {
        telemetry?.('tasks.complete.blocked', {
          taskId,
          status: task.status,
          reason: task.ownerName === null ? 'task_without_owner' : 'task_blocked',
          tags: task.tags,
        });
        return;
      }

      const optimisticAt = new Date().toISOString();
      dispatch({
        type: 'completion_started',
        payload: { taskId, optimisticAt, expectedVersion: task.version },
      });

      try {
        const result = await gateway.completeTask(taskId, task.version);
        telemetry?.('tasks.complete.succeeded', {
          taskId,
          previousVersion: task.version,
          nextVersion: task.version + 1,
          tags: task.tags,
        });
        dispatch({
          type: 'completion_succeeded',
          payload: { taskId, completedAt: result.completedAt },
        });
      } catch (error) {
        telemetry?.('tasks.complete.reverted', {
          taskId,
          previousVersion: task.version,
          message: error instanceof Error ? error.message : 'unexpected_error',
          tags: task.tags,
        });
        dispatch({
          type: 'completion_reverted',
          payload: { taskId, reason: presentationPolicy.mapCompletionError() },
        });
      }
    },
  };
}

/**
 * @param {{ filter: string, onFilterChange: (value: string) => void, summary: string, lastSyncAt: string }} props
 */
const TaskToolbar = memo(function TaskToolbar({ filter, onFilterChange, summary, lastSyncAt }) {
  return (
    <header>
      <h1>Tasks</h1>
      <p>{summary}</p>
      <small>{lastSyncAt ? `Ultima sincronizacao: ${lastSyncAt}` : 'Sem sincronizacao'}</small>
      <input value={filter} onChange={(event) => onFilterChange(event.target.value)} />
    </header>
  );
});

/**
 * @param {{ tasks: Task[], pendingCommands: Record<number, { previousTask: Task, expectedVersion: number }>, onComplete: (taskId: number) => void, emptyMessage: string }} props
 */
const TaskList = memo(function TaskList({ tasks, pendingCommands, onComplete, emptyMessage }) {
  if (tasks.length === 0) {
    return <EmptyState message={emptyMessage} />;
  }

  return tasks.map((task) => {
    const isPending = Boolean(pendingCommands[task.id]);

    return (
      <article key={task.id}>
        <strong>{task.title}</strong>
        <span>{task.status}</span>
        <small>{task.updatedAt}</small>
        <button onClick={() => onComplete(task.id)} disabled={!isTaskCompletable(task) || isPending}>
          {isPending ? 'Concluindo...' : 'Concluir'}
        </button>
      </article>
    );
  });
});

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

export function SeniorMedioBoard({
  gateway = defaultTasksGateway,
  presentationPolicy = defaultPresentationPolicy,
  telemetry,
}) {
  const [filter, setFilter] = useState('');
  const deferredFilter = useDeferredValue(filter);
  const {
    tasksById,
    orderedIds,
    loading,
    loadError,
    pendingCommands,
    completeTask,
    lastSyncAt,
  } = useSeniorBoard({ gateway, presentationPolicy, telemetry });

  const visibleTasks = useMemo(() => {
    const normalizedFilter = deferredFilter.trim().toLowerCase();
    return orderedIds
      .map((taskId) => tasksById[taskId])
      .filter((task) => task && task.title.toLowerCase().includes(normalizedFilter));
  }, [deferredFilter, orderedIds, tasksById]);

  const summary = useMemo(() => {
    const tasks = orderedIds.map((taskId) => tasksById[taskId]).filter(Boolean);
    return presentationPolicy.formatSummary(tasks);
  }, [orderedIds, presentationPolicy, tasksById]);

  const emptyMessage = useMemo(
    () => presentationPolicy.formatEmptyState(deferredFilter),
    [deferredFilter, presentationPolicy]
  );
  const lastSyncLabel = useMemo(
    () => presentationPolicy.formatLastSync(lastSyncAt),
    [lastSyncAt, presentationPolicy]
  );

  function handleFilterChange(nextValue) {
    startTransition(() => {
      setFilter(nextValue);
    });
  }

  return (
    <section>
      <TaskToolbar
        filter={filter}
        onFilterChange={handleFilterChange}
        summary={summary}
        lastSyncAt={lastSyncLabel}
      />
      {loading && <StatusMessage kind="loading" message="Carregando..." />}
      {loadError && <StatusMessage kind="error" message={loadError} />}
      <TaskList
        tasks={visibleTasks}
        pendingCommands={pendingCommands}
        onComplete={completeTask}
        emptyMessage={emptyMessage}
      />
    </section>
  );
}
