package es.cookyourweb.points.task;

import org.springframework.stereotype.Service;

import java.time.Clock;
import java.time.Instant;
import java.util.List;

/**
 * Reglas de negocio de tareas.
 *
 * Esta capa existe para que el controller no sepa de Mongo y el repositorio no
 * sepa de HTTP. Es la misma separacion que ya tiene el frontend entre
 * componentes y services/: los componentes llaman a fetchTasks(), no a Firestore.
 *
 * El Clock se inyecta en vez de llamar a Instant.now() por dentro para que los
 * tests puedan fijar el tiempo y comprobar createdAt y updatedAt de verdad.
 */
@Service
public class TaskService {

    private final TaskRepository repository;
    private final Clock clock;

    public TaskService(TaskRepository repository, Clock clock) {
        this.repository = repository;
        this.clock = clock;
    }

    public List<Task> deFamilia(String familyId) {
        return repository.findByFamilyId(familyId);
    }

    public List<Task> activasDeFamilia(String familyId) {
        return repository.findByFamilyIdAndIsActiveTrue(familyId);
    }

    public Task porId(String id) {
        return repository.findById(id).orElseThrow(() -> new TaskNotFoundException(id));
    }

    public Task crear(Task nueva) {
        Instant ahora = Instant.now(clock);
        return repository.save(nueva.creada(null, ahora));
    }

    /**
     * Actualiza una tarea existente.
     *
     * familyId y createdBy NO se tocan a proposito: una tarea no cambia de
     * familia ni de autor. Si el cliente los manda distintos, se ignoran.
     */
    public Task actualizar(String id, Task cambios) {
        Task original = porId(id);
        return repository.save(cambios.actualizadaDesde(original, Instant.now(clock)));
    }

    public void borrar(String id) {
        if (!repository.existsById(id)) {
            throw new TaskNotFoundException(id);
        }
        repository.deleteById(id);
    }
}
