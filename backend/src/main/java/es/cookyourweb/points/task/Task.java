package es.cookyourweb.points.task;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;

/**
 * Una tarea del sistema de puntos.
 *
 * Es el puerto a Mongo del tipo CustomTask que ya usa el frontend
 * (src/services/customTaskService.ts). Los nombres de campo se mantienen
 * IGUALES a los de TypeScript a proposito: el dia que el frontend deje de
 * hablar con Firestore y hable con esta API, no habra que traducir nada.
 *
 * Es un record y no una clase con setters porque una tarea no se muta a
 * trozos: se reemplaza entera. Eso hace imposible dejarla a medias.
 *
 * Topes de tamano (CWE-770): nombre 50 y description 200 son los mismos maxLength
 * del formulario (src/components/dashboard/TaskManagement.tsx); el servidor los repite
 * porque el navegador no es frontera. Los ids, 128: es el maximo de un uid de Firebase
 * y sobra para los ids de documento autogenerados (20 caracteres).
 */
@Document(collection = "tasks")
public record Task(
        @Id @Size(max = 128, message = "el id no puede pasar de 128 caracteres") String id,

        @NotBlank(message = "el nombre de la tarea no puede estar vacio")
        @Size(max = 50, message = "el nombre no puede pasar de 50 caracteres")
        String nombre,

        @NotNull(message = "la tarea tiene que ser diaria o extra")
        TaskType tipo,

        @Min(value = 0, message = "los puntos no pueden ser negativos")
        int puntos,

        @NotBlank(message = "toda tarea pertenece a una familia")
        @Size(max = 128, message = "el familyId no puede pasar de 128 caracteres")
        String familyId,

        // Sin @NotBlank: lo pone el servidor con el uid del token; si el cliente
        // manda uno, se ignora (nadie puede firmar una tarea como otra persona).
        @Size(max = 128, message = "el createdBy no puede pasar de 128 caracteres")
        String createdBy,

        boolean isActive,

        @Size(max = 200, message = "la descripcion no puede pasar de 200 caracteres")
        String description,

        Instant createdAt,
        Instant updatedAt
) {
    /** Copia con id, creador y fechas de alta. Se usa al crear; el creador es el uid del token. */
    public Task creada(String nuevoId, String creador, Instant ahora) {
        return new Task(nuevoId, nombre, tipo, puntos, familyId, creador,
                isActive, description, ahora, ahora);
    }

    /** Copia conservando id y createdAt, refrescando updatedAt. Se usa al editar. */
    public Task actualizadaDesde(Task original, Instant ahora) {
        return new Task(original.id(), nombre, tipo, puntos, original.familyId(),
                original.createdBy(), isActive, description, original.createdAt(), ahora);
    }
}
