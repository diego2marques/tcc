import java.time.Clock;
import java.util.Optional;

public class PlenoIniciante {
    enum TaskStatus {
        TODO, DOING, DONE, BLOCKED
    }

    record Task(int id, String title, Integer ownerId, TaskStatus status, int estimateHours) {}

    record TaskCompletionResult(boolean ok, String code, Task task) {}

    record AuditEntry(int taskId, String action, String at) {}

    interface TaskRepository {
        Optional<Task> findById(int id);
        Task save(Task task);
    }

    interface AuditGateway {
        void publish(AuditEntry entry);
    }

    static class TaskPolicy {
        Optional<String> validateForCompletion(Task task) {
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

    static class TaskWorkflowService {
        private final TaskRepository taskRepository;
        private final AuditGateway auditGateway;
        private final TaskPolicy taskPolicy;
        private final Clock clock;

        TaskWorkflowService(TaskRepository taskRepository, AuditGateway auditGateway, TaskPolicy taskPolicy, Clock clock) {
            this.taskRepository = taskRepository;
            this.auditGateway = auditGateway;
            this.taskPolicy = taskPolicy;
            this.clock = clock;
        }

        TaskCompletionResult moveToDone(int taskId) {
            Optional<Task> maybeTask = taskRepository.findById(taskId);
            if (maybeTask.isEmpty()) {
                return new TaskCompletionResult(false, "TASK_NOT_FOUND", null);
            }

            Task task = maybeTask.get();
            Optional<String> validationError = taskPolicy.validateForCompletion(task);
            if (validationError.isPresent()) {
                return new TaskCompletionResult(false, validationError.get(), task);
            }

            Task updatedTask = new Task(
                task.id(),
                task.title(),
                task.ownerId(),
                TaskStatus.DONE,
                task.estimateHours()
            );

            taskRepository.save(updatedTask);
            auditGateway.publish(new AuditEntry(updatedTask.id(), "task.completed", clock.instant().toString()));
            return new TaskCompletionResult(true, "OK", updatedTask);
        }
    }
}
