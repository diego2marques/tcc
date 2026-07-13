import java.util.ArrayList;
import java.util.List;

public class JuniorMedio {
    enum TaskStatus {
        TODO, DOING, DONE
    }

    static class Task {
        int id;
        String title;
        String owner;
        TaskStatus status;

        Task(int id, String title, String owner, TaskStatus status) {
            this.id = id;
            this.title = title;
            this.owner = owner;
            this.status = status;
        }
    }

    public static void main(String[] args) {
        List<Task> tasks = new ArrayList<>();
        tasks.add(new Task(1, "Criar backlog", "ana", TaskStatus.TODO));
        tasks.add(new Task(2, "Revisar ticket", null, TaskStatus.DOING));

        Task task = findTask(tasks, 2);
        if (task != null) {
            assign(task, "bruno");
            moveToDone(task);
        }
    }

    static Task findTask(List<Task> tasks, int id) {
        for (Task task : tasks) {
            if (task.id == id) {
                return task;
            }
        }
        return null;
    }

    static void assign(Task task, String owner) {
        task.owner = owner;
    }

    static boolean moveToDone(Task task) {
        if (task.owner == null || task.owner.isBlank()) {
            return false;
        }

        task.status = TaskStatus.DONE;
        return true;
    }
}
