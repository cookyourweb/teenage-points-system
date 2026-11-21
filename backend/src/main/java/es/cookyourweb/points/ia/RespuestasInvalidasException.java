package es.cookyourweb.points.ia;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Afirmaciones sin responder o desconocidas, cada una con su motivo (id -> motivo);
 * la capa web las mapea a 400 con la misma forma de "campos" que el resto de la API.
 */
public class RespuestasInvalidasException extends RuntimeException {

    private final Map<String, String> campos;

    public RespuestasInvalidasException(Map<String, String> campos) {
        super("Respuestas invalidas: " + campos.keySet());
        this.campos = java.util.Collections.unmodifiableMap(new LinkedHashMap<>(campos));
    }

    /** id de afirmacion -> motivo legible ("sin responder" / "no existe"). */
    public Map<String, String> campos() {
        return campos;
    }

    public List<String> ids() {
        return List.copyOf(campos.keySet());
    }
}
