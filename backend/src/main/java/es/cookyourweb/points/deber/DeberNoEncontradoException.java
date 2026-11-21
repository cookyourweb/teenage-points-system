package es.cookyourweb.points.deber;

/**
 * El deber no existe o no es de esa familia e hijo. Es el mismo error en los dos casos
 * (404, nunca 403) para que nadie pueda sondear que ids existen. La capa web la traduce.
 */
public class DeberNoEncontradoException extends RuntimeException {
    public DeberNoEncontradoException() {
        super("deber no encontrado");
    }
}
