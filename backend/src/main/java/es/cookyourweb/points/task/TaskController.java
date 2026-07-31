package es.cookyourweb.points.task;

import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * Capa HTTP de tareas.
 *
 * Cada metodo de aqui es el equivalente de una funcion exportada por
 * src/services/customTaskService.ts. El dia de la migracion, ese fichero deja
 * de llamar a Firestore y llama a estas rutas: los componentes no se enteran.
 *
 *   getTasksByFamily(familyId)  ->  GET    /api/tasks?familyId=...
 *   addCustomTask(task)         ->  POST   /api/tasks
 *   updateCustomTask(id, task)  ->  PUT    /api/tasks/{id}
 *   deleteCustomTask(id)        ->  DELETE /api/tasks/{id}
 */
@RestController
@RequestMapping("/api/tasks")
public class TaskController {

    private final TaskService service;

    public TaskController(TaskService service) {
        this.service = service;
    }

    @GetMapping
    public List<Task> listar(
            @RequestParam String familyId,
            @RequestParam(defaultValue = "false") boolean soloActivas) {
        return soloActivas
                ? service.activasDeFamilia(familyId)
                : service.deFamilia(familyId);
    }

    @GetMapping("/{id}")
    public Task porId(@PathVariable String id) {
        return service.porId(id);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public Task crear(@Valid @RequestBody Task nueva) {
        return service.crear(nueva);
    }

    @PutMapping("/{id}")
    public Task actualizar(@PathVariable String id, @Valid @RequestBody Task cambios) {
        return service.actualizar(id, cambios);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void borrar(@PathVariable String id) {
        service.borrar(id);
    }
}
