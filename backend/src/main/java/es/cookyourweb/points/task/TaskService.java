package es.cookyourweb.points.task;

import es.cookyourweb.points.familia.AccesoFamilia;
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
    private final AccesoFamilia acceso;
    private final Clock clock;

    public TaskService(TaskRepository repository, AccesoFamilia acceso, Clock clock) {
        this.repository = repository;
        this.acceso = acceso;
        this.clock = clock;
    }

    public List<Task> deFamilia(String uid, String familyId) {
        acceso.requireMember(uid, familyId);
        return repository.findByFamilyId(familyId);
    }

    public List<Task> activasDeFamilia(String uid, String familyId) {
        acceso.requireMember(uid, familyId);
        return repository.findByFamilyIdAndIsActiveTrue(familyId);
    }

    public Task porId(String uid, String id) {
        // Una tarea de otra familia da EXACTAMENTE el mismo error que una inexistente:
        // distinguirlas dejaria a cualquiera sondear que ids existen (404 y no 403).
        return repository.findById(id)
                .filter(t -> acceso.esMiembro(uid, t.familyId()))
                .orElseThrow(() -> new TaskNotFoundException(id));
    }

    public Task crear(String uid, Task nueva) {
        // Se comprueba ANTES de guardar: crear en una familia ajena no deja rastro.
        acceso.requireMember(uid, nueva.familyId());
        Instant ahora = Instant.now(clock);
        return repository.save(nueva.creada(null, uid, ahora));
    }

    /**
     * Actualiza una tarea existente.
     *
     * Exige ser de la familia de la tarea (si no, 404 como si no existiera).
     * familyId y createdBy NO se tocan a proposito: una tarea no cambia de
     * familia ni de autor. Si el cliente los manda distintos, se ignoran.
     */
    public Task actualizar(String uid, String id, Task cambios) {
        Task original = porId(uid, id);
        return repository.save(cambios.actualizadaDesde(original, Instant.now(clock)));
    }

    public void borrar(String uid, String id) {
        // porId carga la tarea y comprueba la familia; existsById no sabria de quien es.
        porId(uid, id);
        repository.deleteById(id);
    }
}
