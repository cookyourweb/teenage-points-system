package es.cookyourweb.points.deber;

import java.time.LocalDate;

/**
 * Lo unico que el cliente manda de un deber. familyId, hijoId, createdBy y clave NO estan
 * aqui a proposito: salen de la ruta, del token o se calculan en el servidor.
 * Las validaciones (topes, enlace seguro) llegan con el controller (Task 6).
 */
public record DeberCuerpo(TipoDeber tipo, String asignatura, LocalDate fecha, String titulo, String enlace,
                          String detalle, EstadoEntrega estado, boolean imprimir, String examen,
                          boolean isActive) {
}
