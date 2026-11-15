package es.cookyourweb.points.ia;

import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Contenido de relleno para desarrollar y testear sin el contenido real del metodo.
 * Solo la ESTRUCTURA (ids y nombres de colores) es real; todo el texto es inventado
 * y lleva la marca [FICTICIO] para que nunca se confunda con el original.
 */
@Component
public class ContenidoFicticio implements ContenidoMetodoPort {

    private record Def(String id, String nombre) {}

    private static final List<Def> COLORES = List.of(
            new Def("verde", "Verde"),
            new Def("rojo", "Rojo"),
            new Def("azul", "Azul"),
            new Def("negro", "Negro"),
            new Def("amarillo", "Amarillo"));

    /** Orden fijo e irregular de las afirmaciones: sin periodo 5 y sin empezar por el primer color. */
    private static final List<String> ORDEN_DE_COLORES = List.of(
            "rojo", "azul", "verde", "amarillo", "rojo",
            "negro", "verde", "azul", "negro", "amarillo");

    private final ContenidoTipo contenido = construir();

    @Override
    public ContenidoTipo contenidoDeTipo() {
        return contenido;
    }

    /**
     * Los ids de afirmacion son opacos (a01..a10) y el orden de la lista no sigue el
     * de los colores: ni el id ni la posicion delatan el color a quien reciba {id, texto}.
     * Con contenido ficticio esto solo cubre ese canal; el texto real tendria que revisarse aparte.
     */
    private static ContenidoTipo construir() {
        List<Color> colores = new ArrayList<>();
        for (Def c : COLORES) {
            colores.add(new Color(c.id(), c.nombre(), "[FICTICIO] Descripcion de ejemplo del color " + c.id()));
        }
        List<Afirmacion> afirmaciones = new ArrayList<>();
        Map<String, Integer> vistas = new HashMap<>();
        for (int i = 0; i < ORDEN_DE_COLORES.size(); i++) {
            String colorId = ORDEN_DE_COLORES.get(i);
            int n = vistas.merge(colorId, 1, Integer::sum);
            afirmaciones.add(new Afirmacion(
                    String.format("a%02d", i + 1),
                    "[FICTICIO] Afirmacion de ejemplo " + n + " para el color " + colorId,
                    colorId));
        }
        return new ContenidoTipo(List.copyOf(colores), List.copyOf(afirmaciones));
    }
}
