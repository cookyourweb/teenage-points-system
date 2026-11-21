package es.cookyourweb.points.deber;

/** Ya hay un deber con esa clave para ese hijo. La capa web la traduce a 409. */
public class DeberDuplicadoException extends RuntimeException {
    public DeberDuplicadoException() {
        super("ya existe un deber con esa clave");
    }
}
