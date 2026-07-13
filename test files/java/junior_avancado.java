import java.util.HashMap;
import java.util.Map;

public class JuniorAvancado {
    enum TaskStatus {
        TODO, DOING, DONE
    }

    static class Task {
        private final int id;
        private final String title;
        private Integer ownerId;
        private TaskStatus status;

        Task(int id, String title, Integer ownerId, TaskStatus status) {
            this.id = id;
            this.title = title;
            this.ownerId = ownerId;
            this.status = status;
        }
    }

    interface TaskRepository {
        Task findById(int id);
        Task save(Task task);
    }

    static class InMemoryTaskRepository implements TaskRepository {
        private final Map<Integer, Task> tasks = new HashMap<>();

        InMemoryTaskRepository() {
            tasks.put(1, new Task(1, "Criar backlog", 10, TaskStatus.TODO));
        }

        public Task findById(int id) {
            return tasks.get(id);
        }

        public Task save(Task task) {
            tasks.put(task.id, task);
            return task;
        }
    }

    static class TaskService {
        private final TaskRepository taskRepository;

        TaskService(TaskRepository taskRepository) {
            this.taskRepository = taskRepository;
        }

        boolean completeTask(int taskId) {
            Task task = taskRepository.findById(taskId);
            if (task == null || task.ownerId == null) {
                return false;
            }

            task.status = TaskStatus.DONE;
            taskRepository.save(task);
            return true;
        }
    }
}
