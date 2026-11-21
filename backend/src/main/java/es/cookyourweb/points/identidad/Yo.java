package es.cookyourweb.points.identidad;

/**
 * Quien es la persona que llama, segun el token ya verificado.
 * Los campos que el token no trae (p. ej. el email de una cuenta anonima) quedan
 * en null y Jackson los omite del JSON (default-property-inclusion=non_null).
 */
public record Yo(String uid, String email, Boolean emailVerificado, String proveedor) {
}
