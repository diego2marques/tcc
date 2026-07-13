import { useEffect, useState } from 'react';

function filterTasks(tasks, filter) {
  return tasks.filter((task) => task.title.toLowerCase().includes(filter.toLowerCase()));
}

export function JuniorMedioBoard() {
  const [tasks, setTasks] = useState([]);
  const [filter, setFilter] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    async function loadTasks() {
      setLoading(true);
      setError('');

      try {
        const response = await fetch('/api/tasks');
        const data = await response.json();

        if (!cancelled) {
          setTasks(data);
        }
      } catch {
        if (!cancelled) {
          setError('Erro ao carregar tasks');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadTasks();
    return () => {
      cancelled = true;
    };
  }, []);

  function completeTask(taskId) {
    setTasks((currentTasks) =>
      currentTasks.map((task) =>
        task.id === taskId ? { ...task, status: 'done' } : task
      )
    );
  }

  const visibleTasks = filterTasks(tasks, filter);

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
