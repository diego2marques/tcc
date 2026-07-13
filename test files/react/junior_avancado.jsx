import { useEffect, useMemo, useState } from 'react';

function useTasks() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;

    async function loadTasks() {
      setLoading(true);
      setError('');

      try {
        const response = await fetch('/api/tasks');
        const data = await response.json();
        if (active) {
          setTasks(data);
        }
      } catch {
        if (active) {
          setError('Erro ao carregar tasks');
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadTasks();
    return () => {
      active = false;
    };
  }, []);

  function completeTask(taskId) {
    setTasks((currentTasks) =>
      currentTasks.map((task) =>
        task.id === taskId ? { ...task, status: 'done' } : task
      )
    );
  }

  return { tasks, loading, error, completeTask };
}

export function JuniorAvancadoBoard() {
  const [filter, setFilter] = useState('');
  const { tasks, loading, error, completeTask } = useTasks();

  const visibleTasks = useMemo(() => {
    return tasks.filter((task) => task.title.toLowerCase().includes(filter.toLowerCase()));
  }, [tasks, filter]);

  return (
    <section>
      <h1>Tasks</h1>
      <input value={filter} onChange={(event) => setFilter(event.target.value)} />
      {loading && <p>Carregando...</p>}
      {error && <p>{error}</p>}
      {visibleTasks.map((task) => (
        <article key={task.id}>
          <strong>{task.title}</strong>
          <span>{task.status}</span>
          <button onClick={() => completeTask(task.id)}>Concluir</button>
        </article>
      ))}
    </section>
  );
}
