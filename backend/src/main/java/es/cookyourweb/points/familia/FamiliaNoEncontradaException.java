package es.cookyourweb.points.familia;

/**
 * No eres de esa familia (o no existe). Se traduce a 404 y no a 403 a
 * proposito: un 403 confirmaria que la familia existe.
 */
public class FamiliaNoEncontradaException extends RuntimeException {
    public FamiliaNoEncontradaException() {
        super("familia no encontrada");
    }
}
