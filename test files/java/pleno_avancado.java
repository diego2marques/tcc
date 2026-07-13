import java.time.Clock;
import java.util.Optional;

public class PlenoAvancado {
    enum TaskStatus {
        TODO, DOING, DONE, BLOCKED
    }

    record Task(int id, String title, Integer ownerId, TaskStatus status, int estimateHours) {}

    record CompleteTaskOutput(int taskId, String completedAt) {}

    interface TaskRepository {
        Optional<Task> findById(int id);
        Task save(Task task);
    }

    interface AuditGateway {
        void publish(int taskId, String action, String at);
    }

    static class TaskPolicy {
        Optional<String> validate(Task task) {
            if (task.ownerId() == null) {
                return Optional.of("TASK_WITHOUT_OWNER");
            }

            if (task.status() == TaskStatus.BLOCKED) {
                return Optional.of("TASK_BLOCKED");
            }

            if (task.estimateHours() <= 0) {
                return Optional.of("INVALID_ESTIMATE");
            }

            return Optional.empty();
        }
    }

    static class CompleteTaskUseCase {
        private final TaskRepository taskRepository;
        private final AuditGateway auditGateway;
        private final Clock clock;
        private final TaskPolicy taskPolicy;

        CompleteTaskUseCase(TaskRepository taskRepository, AuditGateway auditGateway, Clock clock, TaskPolicy taskPolicy) {
            this.taskRepository = taskRepository;
            this.auditGateway = auditGateway;
            this.clock = clock;
            this.taskPolicy = taskPolicy;
        }

        Optional<CompleteTaskOutput> execute(int taskId) {
            Optional<Task> maybeTask = taskRepository.findById(taskId);
            if (maybeTask.isEmpty()) {
                return Optional.empty();
            }

            Task task = maybeTask.get();
            if (taskPolicy.validate(task).isPresent()) {
                return Optional.empty();
            }

            String completedAt = clock.instant().toString();
            Task updatedTask = new Task(task.id(), task.title(), task.ownerId(), TaskStatus.DONE, task.estimateHours());
            taskRepository.save(updatedTask);
            auditGateway.publish(updatedTask.id(), "task.completed", completedAt);
            return Optional.of(new CompleteTaskOutput(updatedTask.id(), completedAt));
        }
    }
}
