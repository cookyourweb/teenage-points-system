package es.cookyourweb.points.task;

/** La tarea pedida no existe. La capa web la traduce a un 404. */
public class TaskNotFoundException extends RuntimeException {
    public TaskNotFoundException(String id) {
        super("no existe la tarea " + id);
    }
}
