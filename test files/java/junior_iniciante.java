import java.util.ArrayList;
import java.util.List;

public class JuniorIniciante {
    static class Task {
        int id;
        String title;
        boolean done;
        String owner;

        Task(int id, String title, boolean done, String owner) {
            this.id = id;
            this.title = title;
            this.done = done;
            this.owner = owner;
        }
    }

    public static void main(String[] args) {
        List<Task> tasks = new ArrayList<>();
        tasks.add(new Task(1, "Criar backlog", false, "ana"));
        tasks.add(new Task(2, "Revisar ticket", false, null));

        completeTask(tasks, "1");
    }

    static void completeTask(List<Task> tasks, String id) {
        for (Task task : tasks) {
            if ((task.id + "").equals(id)) {
                task.done = true;
                System.out.println("Task finalizada: " + task.title);
                return;
            }
        }

        System.out.println("Task nao encontrada");
    }
}
