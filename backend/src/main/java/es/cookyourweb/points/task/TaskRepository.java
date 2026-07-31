package es.cookyourweb.points.task;

import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;

/**
 * Acceso a datos de tareas.
 *
 * No hay implementacion y no es un olvido: Spring Data la genera en arranque
 * leyendo el NOMBRE de cada metodo. findByFamilyId se traduce a una consulta
 * por el campo familyId. Ese es el equivalente de las llamadas a Firestore que
 * hoy viven en src/services/customTaskService.ts.
 */
public interface TaskRepository extends MongoRepository<Task, String> {

    List<Task> findByFamilyId(String familyId);

    List<Task> findByFamilyIdAndIsActiveTrue(String familyId);

    List<Task> findByCreatedBy(String createdBy);
}
