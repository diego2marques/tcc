import { useEffect, useState } from 'react';

export function JuniorInicianteBoard() {
  const [tasks, setTasks] = useState([]);
  const [filter, setFilter] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);

    fetch('/api/tasks')
      .then((response) => response.json())
      .then((data) => {
        setTasks(data);
        setLoading(false);
      });
  }, []);

  function completeTask(taskId) {
    const nextTasks = tasks.map((task) => {
      if (task.id === taskId) {
        task.status = 'done';
      }

      return task;
    });

    setTasks(nextTasks);
  }

  const visibleTasks = tasks.filter((task) => task.title.toLowerCase().includes(filter.toLowerCase()));

  return (
    <div>
      <h1>Tasks</h1>
      <input value={filter} onChange={(event) => setFilter(event.target.value)} />
      {loading && <p>Carregando...</p>}
      {visibleTasks.map((task) => (
        <div key={task.id}>
          <span>{task.title}</span>
          <button onClick={() => completeTask(task.id)}>Concluir</button>
        </div>
      ))}
    </div>
  );
}
