package es.cookyourweb.points.task;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;

/**
 * Tipo de tarea. Refleja el union de TypeScript: 'diarias' | 'extra'.
 *
 * El valor que viaja por JSON es el de TypeScript en minusculas, no el nombre
 * de la constante Java. Asi el contrato con el frontend no cambia.
 */
public enum TaskType {
    DIARIAS("diarias"),
    EXTRA("extra");

    private final String valor;

    TaskType(String valor) {
        this.valor = valor;
    }

    @JsonValue
    public String getValor() {
        return valor;
    }

    @JsonCreator
    public static TaskType desde(String valor) {
        for (TaskType t : values()) {
            if (t.valor.equalsIgnoreCase(valor)) {
                return t;
            }
        }
        throw new IllegalArgumentException(
                "tipo de tarea desconocido: '" + valor + "'. Validos: diarias, extra");
    }
}
