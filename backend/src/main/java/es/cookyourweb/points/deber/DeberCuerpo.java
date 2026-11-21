package es.cookyourweb.points.deber;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

import java.time.LocalDate;

/**
 * Lo unico que el cliente manda de un deber. familyId, hijoId, createdBy y clave NO estan
 * aqui a proposito: salen de la ruta, del token o se calculan en el servidor.
 * Los topes son los del front (asignatura 60, titulo 120, detalle 500, enlace 500) y se miden
 * con String.length(), igual que .length de JS. El enlace es obligatorio: sin el la clave no se calcula.
 */
public record DeberCuerpo(
        @NotNull(message = "el tipo es obligatorio") TipoDeber tipo,
        @NotBlank(message = "la asignatura es obligatoria")
        @Size(max = 60, message = "la asignatura no pasa de 60 caracteres")
        @Pattern(regexp = SIN_CONTROL, message = "hay caracteres de control o de direccion") String asignatura,
        LocalDate fecha,
        @NotBlank(message = "el titulo es obligatorio")
        @Size(max = 120, message = "el titulo no pasa de 120 caracteres")
        @Pattern(regexp = SIN_CONTROL, message = "hay caracteres de control o de direccion") String titulo,
        @NotBlank(message = "el enlace es obligatorio")
        @Size(max = 500, message = "el enlace no pasa de 500 caracteres")
        @EnlaceSeguro String enlace,
        @Size(max = 500, message = "el detalle no pasa de 500 caracteres")
        @Pattern(regexp = SIN_CONTROL, message = "hay caracteres de control o de direccion") String detalle,
        EstadoEntrega estado,
        boolean imprimir,
        @Size(max = 500, message = "el examen no pasa de 500 caracteres")
        @EnlaceSeguro String examen,
        boolean isActive) {

    /** Sin control (Cc: U+0000-001F, U+007F-009F) ni direccion (U+202A-202E, U+2066-2069). */
    static final String SIN_CONTROL = "[^\\p{Cc}\\u202A-\\u202E\\u2066-\\u2069]*";
}
