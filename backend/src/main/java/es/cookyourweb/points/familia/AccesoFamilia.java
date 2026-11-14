package es.cookyourweb.points.familia;

import org.springframework.stereotype.Service;

/**
 * La unica funcion de pertenencia de todo el backend.
 *
 * Todas las rutas que tocan datos de una familia pasan por requireMember: asi
 * la regla vive en un solo sitio y no se puede olvidar en una ruta nueva sin
 * que se note. El uid debe venir SIEMPRE del JWT verificado.
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
