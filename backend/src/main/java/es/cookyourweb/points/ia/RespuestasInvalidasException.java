package es.cookyourweb.points.ia;

import java.util.List;

/** Ids de afirmaciones sin responder o desconocidas; la capa web los mapea a 400. */
public class RespuestasInvalidasException extends RuntimeException {

    private final List<String> ids;

    public RespuestasInvalidasException(List<String> ids) {
        super("Respuestas invalidas: " + ids);
        this.ids = List.copyOf(ids);
    }

    public List<String> ids() {
        return ids;
    }
}
