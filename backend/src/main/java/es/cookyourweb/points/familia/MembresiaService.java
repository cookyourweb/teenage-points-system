package es.cookyourweb.points.familia;

import org.springframework.dao.DuplicateKeyException;
import org.springframework.stereotype.Service;

import java.time.Clock;

/**
 * Crea la membresia de quien llama. El familyId NUNCA viene del navegador: se
 * lee de Firestore con el token de la propia persona (ver PerfilFirestore).
 */
@Service
public class MembresiaService {

    private final MembresiaRepository repository;
    private final PerfilFirestore perfil;
    private final Clock clock;

    public MembresiaService(MembresiaRepository repository, PerfilFirestore perfil, Clock clock) {
        this.repository = repository;
        this.perfil = perfil;
        this.clock = clock;
    }

    /** Idempotente: llamarla dos veces (o desde dos pestanas a la vez) deja una sola membresia. */
    public Membresia asegurarMiMembresia(String uid, String token) {
        if (uid == null || uid.isBlank()) {
            throw new IllegalArgumentException("uid obligatorio");
        }
        String familyId = perfil.familyIdDe(uid, token)
                .filter(f -> !f.isBlank())
                .orElseThrow(FamiliaNoEncontradaException::new);

        return repository.findByUidAndFamilyId(uid, familyId).orElseGet(() -> crear(uid, familyId));
    }

    private Membresia crear(String uid, String familyId) {
        try {
            return repository.save(new Membresia(
                    null, uid, familyId, Papel.ADULTO, EstadoMembresia.ACTIVA, clock.instant()));
        } catch (DuplicateKeyException carrera) {
            // El indice unico (uid, familyId) paro a la segunda: se devuelve la que gano.
            return repository.findByUidAndFamilyId(uid, familyId).orElseThrow(() -> carrera);
        }
    }
}
