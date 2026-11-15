package es.cookyourweb.points.ia;

import java.util.List;

/** La eleccion de colores no cumple las reglas; la capa web la mapea a 400 con los campos que fallan. */
public class EleccionInvalidaException extends RuntimeException {

    private final List<String> campos;

    public EleccionInvalidaException(List<String> campos) {
        super("Eleccion invalida: " + campos);
        this.campos = List.copyOf(campos);
    }

    public List<String> campos() {
        return campos;
    }
}
