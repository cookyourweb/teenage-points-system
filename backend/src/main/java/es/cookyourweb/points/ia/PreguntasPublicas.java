package es.cookyourweb.points.ia;

import java.util.List;

/**
 * Lo unico que el navegador ve del test: colores con su descripcion y afirmaciones
 * {id, texto}. No existe campo para el color de cada afirmacion: el mapa
 * afirmacion->color vive solo en el servidor.
 */
public record PreguntasPublicas(List<ColorPublico> colores, List<AfirmacionPublica> afirmaciones) {

    public record ColorPublico(String id, String nombre, String descripcion) {}

    public record AfirmacionPublica(String id, String texto) {}

    public static PreguntasPublicas de(ContenidoTipo contenido) {
        return new PreguntasPublicas(
                contenido.colores().stream()
                        .map(c -> new ColorPublico(c.id(), c.nombre(), c.descripcion())).toList(),
                contenido.afirmaciones().stream()
                        .map(a -> new AfirmacionPublica(a.id(), a.texto())).toList());
    }
}
