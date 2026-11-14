package es.cookyourweb.points.familia;

import org.springframework.stereotype.Service;

/**
 * La unica funcion de pertenencia de todo el backend.
 *
 * Las rutas que reciben un familyId (p. ej. GET /api/tasks?familyId=) pasan por
 * requireMember. Las rutas por id de recurso (p. ej. /api/tasks/{id}) no traen
 * familyId: cargan el recurso y usan esMiembro sobre la familia GUARDADA en el
 * recurso, nunca sobre la que diga la peticion. Asi la regla vive en un solo
 * sitio. El uid debe venir SIEMPRE del JWT verificado.
 */
@Service
public class AccesoFamilia {

    private final MembresiaRepository repository;

    public AccesoFamilia(MembresiaRepository repository) {
        this.repository = repository;
    }

    /** Lanza FamiliaNoEncontradaException (404) si no hay membresia ACTIVA. */
    public void requireMember(String uid, String familyId) {
        if (!esMiembro(uid, familyId)) {
            throw new FamiliaNoEncontradaException();
        }
    }

    public boolean esMiembro(String uid, String familyId) {
        // Sin uid o familyId ni se consulta: una cadena vacia nunca es una familia.
        if (enBlanco(uid) || enBlanco(familyId)) {
            return false;
        }
        return repository.existsByUidAndFamilyIdAndEstado(uid, familyId, EstadoMembresia.ACTIVA);
    }

    private static boolean enBlanco(String s) {
        return s == null || s.isBlank();
    }
}
