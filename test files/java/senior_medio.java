import java.time.Clock;
import java.util.Map;
import java.util.Optional;

public class SeniorMedio {
    enum TaskStatus {
        TODO, DOING, DONE, BLOCKED
    }

    record TaskSnapshot(
        int id,
        String title,
        Integer ownerId,
        TaskStatus status,
        int estimateHours,
        int version,
        boolean customerFacing
    ) {}

    record AuditMetadata(TaskStatus previousStatus, int estimateHours, int previousVersion, boolean customerFacing) {}

    record AuditEntry(int entityId, String action, String at, AuditMetadata metadata) {}

    record CompleteTaskOutput(int taskId, String completedAt, int nextVersion) {}

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
        Optional<String> validate(TaskSnapshot task) {
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

        Optional<CompleteTaskOutput> execute(int taskId) {
            Optional<TaskSnapshot> maybeTask = taskRepository.findById(taskId);
            if (maybeTask.isEmpty()) {
                monitoringGateway.warn("task.complete.not_found", Map.of("taskId", taskId));
                return Optional.empty();
            }

            TaskSnapshot task = maybeTask.get();
            Optional<String> validationError = taskCompletionPolicy.validate(task);
            if (validationError.isPresent()) {
                monitoringGateway.warn("task.complete.validation_failed", Map.of(
                    "taskId", task.id(),
                    "code", validationError.get(),
                    "customerFacing", task.customerFacing()
                ));
                return Optional.empty();
            }

            String completedAt = clock.instant().toString();
            TaskSnapshot updatedTask = new TaskSnapshot(
                task.id(),
                task.title(),
                task.ownerId(),
                TaskStatus.DONE,
                task.estimateHours(),
                task.version() + 1,
                task.customerFacing()
            );

            taskRepository.save(updatedTask);
            auditGateway.publish(new AuditEntry(
                updatedTask.id(),
                "task.completed",
                completedAt,
                new AuditMetadata(task.status(), task.estimateHours(), task.version(), task.customerFacing())
            ));
            monitoringGateway.info("task.complete.succeeded", Map.of(
                "taskId", updatedTask.id(),
                "nextVersion", updatedTask.version(),
                "customerFacing", updatedTask.customerFacing()
            ));
            return Optional.of(new CompleteTaskOutput(updatedTask.id(), completedAt, updatedTask.version()));
        }
    }
}
