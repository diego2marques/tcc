import java.time.Clock;
import java.util.Map;
import java.util.Optional;

public class SeniorAvancado {
    enum TaskStatus {
        TODO, DOING, DONE, BLOCKED
    }

    record TaskSnapshot(int id, String title, Integer ownerId, TaskStatus status, int estimateHours, int version) {}

    record AuditMetadata(TaskStatus previousStatus, int estimateHours, int previousVersion) {}

    record AuditEntry(int entityId, String action, String at, AuditMetadata metadata) {}

    record CompleteTaskCommand(int taskId) {}

    record CompleteTaskOutput(int taskId, String completedAt, int nextVersion) {}

    sealed interface CompleteTaskFailure permits TaskNotFound, ValidationFailure, ExternalDependencyFailure {
        String code();
    }

    record TaskNotFound() implements CompleteTaskFailure {
        public String code() {
            return "TASK_NOT_FOUND";
        }
    }

    record ValidationFailure(String code) implements CompleteTaskFailure {}

    record ExternalDependencyFailure(String code) implements CompleteTaskFailure {}

    sealed interface Result<T> permits Success, Failure {}

    record Success<T>(T value) implements Result<T> {}

    record Failure<T>(CompleteTaskFailure error) implements Result<T> {}

    interface TaskRepository {
        Optional<TaskSnapshot> findById(int id);
        TaskSnapshot save(TaskSnapshot task);
    }

    interface AuditGateway {
        void publish(AuditEntry entry);
    }

    interface MonitoringGateway {
        void info(String event, Map<String, Object> context);
        void warn(String event, Map<String, Object> context);
    }

    static class TaskCompletionPolicy {
        Optional<ValidationFailure> validate(TaskSnapshot task) {
            if (task.ownerId() == null) {
                return Optional.of(new ValidationFailure("TASK_WITHOUT_OWNER"));
            }

            if (task.status() == TaskStatus.BLOCKED) {
                return Optional.of(new ValidationFailure("TASK_BLOCKED"));
            }

            if (task.estimateHours() <= 0) {
                return Optional.of(new ValidationFailure("INVALID_ESTIMATE"));
            }

            return Optional.empty();
        }
    }

    static class CompleteTaskUseCase {
        private final TaskRepository taskRepository;
        private final AuditGateway auditGateway;
        private final MonitoringGateway monitoringGateway;
        private final Clock clock;
        private final TaskCompletionPolicy taskCompletionPolicy;

        CompleteTaskUseCase(
            TaskRepository taskRepository,
            AuditGateway auditGateway,
            MonitoringGateway monitoringGateway,
            Clock clock,
            TaskCompletionPolicy taskCompletionPolicy
        ) {
            this.taskRepository = taskRepository;
            this.auditGateway = auditGateway;
            this.monitoringGateway = monitoringGateway;
            this.clock = clock;
            this.taskCompletionPolicy = taskCompletionPolicy;
        }

        Result<CompleteTaskOutput> execute(CompleteTaskCommand command) {
            Optional<TaskSnapshot> maybeTask = taskRepository.findById(command.taskId());
            if (maybeTask.isEmpty()) {
                monitoringGateway.warn("task.complete.not_found", Map.of("taskId", command.taskId()));
                return new Failure<>(new TaskNotFound());
            }

            TaskSnapshot task = maybeTask.get();
            Optional<ValidationFailure> validationFailure = taskCompletionPolicy.validate(task);
            if (validationFailure.isPresent()) {
                monitoringGateway.warn("task.complete.validation_failed", Map.of(
                    "taskId", task.id(),
                    "code", validationFailure.get().code()
                ));
                return new Failure<>(validationFailure.get());
            }

            String completedAt = clock.instant().toString();
            TaskSnapshot updatedTask = new TaskSnapshot(
                task.id(),
                task.title(),
                task.ownerId(),
                TaskStatus.DONE,
                task.estimateHours(),
                task.version() + 1
            );

            try {
                taskRepository.save(updatedTask);
                auditGateway.publish(new AuditEntry(
                    updatedTask.id(),
                    "task.completed",
                    completedAt,
                    new AuditMetadata(task.status(), task.estimateHours(), task.version())
                ));
            } catch (RuntimeException exception) {
                monitoringGateway.warn("task.complete.audit_unavailable", Map.of(
                    "taskId", task.id(),
                    "previousVersion", task.version()
                ));
                return new Failure<>(new ExternalDependencyFailure("AUDIT_UNAVAILABLE"));
            }

            monitoringGateway.info("task.complete.succeeded", Map.of(
                "taskId", updatedTask.id(),
                "nextVersion", updatedTask.version()
            ));

            return new Success<>(new CompleteTaskOutput(updatedTask.id(), completedAt, updatedTask.version()));
        }
    }
}
