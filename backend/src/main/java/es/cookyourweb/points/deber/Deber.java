package es.cookyourweb.points.deber;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.CompoundIndex;
import org.springframework.data.mongodb.core.mapping.Document;

import java.net.URI;
import java.net.URISyntaxException;
import java.time.Instant;
import java.time.LocalDate;
import java.util.Arrays;
import java.util.stream.Collectors;

/**
 * Un deber de un hijo (examen, entrega, material o aviso). Tipo aparte de Task: no son tareas
 * y no llevan puntos. La identidad es la clave, calculada aqui en el servidor.
 */
@Document("deberes")
@CompoundIndex(def = "{'familyId': 1, 'hijoId': 1, 'clave': 1}", unique = true)
public record Deber(
        @Id String id, String familyId, String hijoId, String createdBy, TipoDeber tipo,
        String asignatura, LocalDate fecha, String titulo, String enlace, String clave, String detalle,
        EstadoEntrega estado, boolean imprimir, String examen, boolean isActive,
        Instant createdAt, Instant updatedAt) {

    private static final String HOST_CLASSROOM = "classroom.google.com";

    /**
     * Misma clave que claveDeDeber de src/utils/deberes/enlaces.ts. El MATERIAL lleva su examen y,
     * si no hay, la clave CONSERVA el espacio final ("MATERIAL <enlace> "), igual que el front.
     */
    static String claveDe(TipoDeber tipo, String enlace, String examen) {
        String canonico = claveDeEnlace(enlace);
        if (tipo == TipoDeber.MATERIAL) {
            return "MATERIAL " + canonico + " " + (examen == null || examen.isEmpty() ? "" : claveDeEnlace(examen));
        }
        return canonico;
    }

    /**
     * Forma canonica del enlace (port de claveDeEnlace): sin ancla; en Classroom, sin /u/<n>, sin
     * barra final y sin authuser. Asume un enlace ya validado como seguro (https, host de dominio).
     */
    static String claveDeEnlace(String enlace) {
        URI uri;
        try {
            uri = new URI(enlace);
        } catch (URISyntaxException e) {
            return enlace;
        }
        if (uri.getHost() == null) return enlace;
        String host = uri.getHost().toLowerCase(java.util.Locale.ROOT);
        int puerto = uri.getPort();
        String autoridad = host + (puerto >= 0 && puerto != 443 ? ":" + puerto : "");
        String ruta = uri.getRawPath() == null || uri.getRawPath().isEmpty() ? "/" : uri.getRawPath();
        String consulta = uri.getRawQuery();

        if (!host.equals(HOST_CLASSROOM)) {
            return "https://" + autoridad + ruta + (consulta != null ? "?" + consulta : "");
        }
        ruta = ruta.replaceFirst("^/u/\\d+(?=/|$)", "").replaceAll("/+$", "");
        String sinCuenta = consulta == null ? "" : Arrays.stream(consulta.split("&"))
                .filter(par -> !(par.equals("authuser") || par.startsWith("authuser=")))
                .collect(Collectors.joining("&"));
        return "https://" + autoridad + ruta + (sinCuenta.isEmpty() ? "" : "?" + sinCuenta);
    }
}
