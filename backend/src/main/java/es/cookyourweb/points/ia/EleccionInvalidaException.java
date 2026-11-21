package es.cookyourweb.points.ia;

import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.Map;

/** La eleccion de colores no cumple las reglas; la capa web la mapea a 400 con campo -> motivo. */
public class EleccionInvalidaException extends RuntimeException {

    private final Map<String, String> campos;

    public EleccionInvalidaException(Map<String, String> campos) {
        super("Eleccion invalida: " + campos.keySet());
        this.campos = Collections.unmodifiableMap(new LinkedHashMap<>(campos));
    }

    /** campo -> motivo legible, en el mismo formato que "campos" de la validacion de la API. */
    public Map<String, String> campos() {
        return campos;
    }
}
