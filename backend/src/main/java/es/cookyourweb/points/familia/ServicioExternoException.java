package es.cookyourweb.points.familia;

/**
 * Un servicio del que dependemos (Firestore) fallo: red caida, timeout, 5xx.
 * Se traduce a 502 y NO a 404 para no confundir "Firestore no responde" con
 * "no eres de esa familia".
 */
public class ServicioExternoException extends RuntimeException {
    public ServicioExternoException(String mensaje, Throwable causa) {
        super(mensaje, causa);
    }
}
