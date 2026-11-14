package es.cookyourweb.points.task;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
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
 */
@Document(collection = "tasks")
public record Task(
        @Id String id,

        @NotBlank(message = "el nombre de la tarea no puede estar vacio")
        String nombre,

        @NotNull(message = "la tarea tiene que ser diaria o extra")
        TaskType tipo,

        @Min(value = 0, message = "los puntos no pueden ser negativos")
        int puntos,

        @NotBlank(message = "toda tarea pertenece a una familia")
        String familyId,

        // Sin @NotBlank: lo pone el servidor con el uid del token; si el cliente
        // manda uno, se ignora (nadie puede firmar una tarea como otra persona).
        String createdBy,

        boolean isActive,

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
