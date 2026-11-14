package es.cookyourweb.points.task;

import jakarta.validation.Valid;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
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
            @AuthenticationPrincipal Jwt jwt,
            @RequestParam String familyId,
            @RequestParam(defaultValue = "false") boolean soloActivas) {
        return soloActivas
                ? service.activasDeFamilia(jwt.getSubject(), familyId)
                : service.deFamilia(jwt.getSubject(), familyId);
    }

    @GetMapping("/{id}")
    public Task porId(@AuthenticationPrincipal Jwt jwt, @PathVariable String id) {
        return service.porId(jwt.getSubject(), id);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public Task crear(@AuthenticationPrincipal Jwt jwt, @Valid @RequestBody Task nueva) {
        return service.crear(jwt.getSubject(), nueva);
    }

    @PutMapping("/{id}")
    public Task actualizar(@AuthenticationPrincipal Jwt jwt, @PathVariable String id, @Valid @RequestBody Task cambios) {
        return service.actualizar(jwt.getSubject(), id, cambios);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void borrar(@AuthenticationPrincipal Jwt jwt, @PathVariable String id) {
        service.borrar(jwt.getSubject(), id);
    }
}
