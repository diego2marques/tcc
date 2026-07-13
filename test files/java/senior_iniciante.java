import java.time.Clock;
import java.time.Instant;
import java.util.Map;
import java.util.Optional;

public class SeniorTaskCompletionService {

    private final TaskRepository taskRepository;
    private final TaskPolicy taskPolicy;
    private final AuditGateway auditGateway;
    private final MonitoringGateway monitoringGateway;
    private final Clock clock;

    public SeniorTaskCompletionService(
            TaskRepository taskRepository,
            TaskPolicy taskPolicy,
            AuditGateway auditGateway,
            MonitoringGateway monitoringGateway,
            Clock clock
    ) {
        this.taskRepository = taskRepository;
        this.taskPolicy = taskPolicy;
        this.auditGateway = auditGateway;
        this.monitoringGateway = monitoringGateway;
        this.clock = clock;
    }

    public CompletionResult complete(CompletionCommand command) {
        Optional<TaskSnapshot> maybeTask = taskRepository.findById(command.taskId());
        if (maybeTask.isEmpty()) {
            monitoringGateway.warn("task.complete.not_found", Map.of("taskId", command.taskId()));
            return CompletionResult.failure("TASK_NOT_FOUND");
        }

        TaskSnapshot task = maybeTask.get();
        PolicyDecision decision = taskPolicy.evaluate(task);
        if (!decision.allowed()) {
            monitoringGateway.warn(
                    "task.complete.validation_failed",
                    Map.of("taskId", task.id(), "code", decision.code())
            );
            return CompletionResult.failure(decision.code());
        }

        if (command.expectedVersion() != task.version()) {
            monitoringGateway.warn(
                    "task.complete.version_conflict",
                    Map.of("taskId", task.id(), "expectedVersion", command.expectedVersion(), "currentVersion", task.version())
            );
            return CompletionResult.failure("VERSION_CONFLICT");
        }

        Instant completedAt = clock.instant();
        TaskSnapshot updatedTask = task.completeAt(completedAt);
        taskRepository.save(updatedTask);

        auditGateway.publish(
                new AuditEntry(
                        updatedTask.id(),
                        "task.completed",
                        completedAt,
                        Map.of(
                                "previousStatus", task.status(),
                                "previousVersion", task.version(),
                                "estimateHours", task.estimateHours()
                        )
                )
        );

        monitoringGateway.info(
                "task.complete.succeeded",
                Map.of("taskId", updatedTask.id(), "nextVersion", updatedTask.version())
        );

        return CompletionResult.success(updatedTask.id(), completedAt, updatedTask.version());
    }

    public record CompletionCommand(long taskId, int expectedVersion) {
    }

    public record CompletionResult(boolean success, String code, Long taskId, Instant completedAt, Integer nextVersion) {
        public static CompletionResult success(long taskId, Instant completedAt, int nextVersion) {
            return new CompletionResult(true, "OK", taskId, completedAt, nextVersion);
        }

        public static CompletionResult failure(String code) {
            return new CompletionResult(false, code, null, null, null);
        }
    }

    public record TaskSnapshot(
            long id,
            String title,
            Long ownerId,
            String status,
            int estimateHours,
            int version
    ) {
        public TaskSnapshot completeAt(Instant completedAt) {
            return new TaskSnapshot(id, title, ownerId, "DONE", estimateHours, version + 1);
        }
    }

    public record PolicyDecision(boolean allowed, String code) {
        public static PolicyDecision allow() {
            return new PolicyDecision(true, "OK");
        }

        public static PolicyDecision deny(String code) {
            return new PolicyDecision(false, code);
        }
    }

    public interface TaskRepository {
        Optional<TaskSnapshot> findById(long taskId);

        void save(TaskSnapshot task);
    }

    public interface TaskPolicy {
        PolicyDecision evaluate(TaskSnapshot task);
    }

    public interface AuditGateway {
        void publish(AuditEntry entry);
    }

    public interface MonitoringGateway {
        void info(String event, Map<String, Object> context);

        void warn(String event, Map<String, Object> context);
    }

    public record AuditEntry(long entityId, String action, Instant occurredAt, Map<String, Object> metadata) {
    }
}
