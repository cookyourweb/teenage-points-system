package es.cookyourweb.points.ia;

import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;

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

    private static final int AFIRMACIONES_POR_COLOR = 2;

    private final ContenidoTipo contenido = construir();

    @Override
    public ContenidoTipo contenidoDeTipo() {
        return contenido;
    }

    /**
     * Los ids de afirmacion son opacos (a01..a10) y van intercalados por color:
     * el navegador recibe {id, texto} y no debe poder deducir a que color apunta cada una.
     */
    private static ContenidoTipo construir() {
        List<Color> colores = new ArrayList<>();
        List<Afirmacion> afirmaciones = new ArrayList<>();
        for (Def c : COLORES) {
            colores.add(new Color(c.id(), c.nombre(), "[FICTICIO] Descripcion de ejemplo del color " + c.id()));
        }
        int n = 1;
        for (int ronda = 1; ronda <= AFIRMACIONES_POR_COLOR; ronda++) {
            for (Def c : COLORES) {
                afirmaciones.add(new Afirmacion(
                        String.format("a%02d", n++),
                        "[FICTICIO] Afirmacion de ejemplo " + ronda + " para el color " + c.id(),
                        c.id()));
            }
        }
        return new ContenidoTipo(List.copyOf(colores), List.copyOf(afirmaciones));
    }
}
