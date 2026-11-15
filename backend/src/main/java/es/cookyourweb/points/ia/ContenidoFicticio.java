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

    private static final List<String[]> COLORES = List.of(
            new String[] {"verde", "Verde"},
            new String[] {"rojo", "Rojo"},
            new String[] {"azul", "Azul"},
            new String[] {"negro", "Negro"},
            new String[] {"amarillo", "Amarillo"});

    private static final int AFIRMACIONES_POR_COLOR = 2;

    private final ContenidoTipo contenido = construir();

    @Override
    public ContenidoTipo contenidoDeTipo() {
        return contenido;
    }

    private static ContenidoTipo construir() {
        List<Color> colores = new ArrayList<>();
        List<Afirmacion> afirmaciones = new ArrayList<>();
        for (String[] c : COLORES) {
            String id = c[0];
            colores.add(new Color(id, c[1], "[FICTICIO] Descripcion de ejemplo del color " + id));
            for (int i = 1; i <= AFIRMACIONES_POR_COLOR; i++) {
                afirmaciones.add(new Afirmacion(
                        id + "-" + i,
                        "[FICTICIO] Afirmacion de ejemplo " + i + " para el color " + id,
                        id));
            }
        }
        return new ContenidoTipo(List.copyOf(colores), List.copyOf(afirmaciones));
    }
}
