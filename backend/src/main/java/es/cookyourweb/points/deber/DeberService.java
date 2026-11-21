package es.cookyourweb.points.deber;

import es.cookyourweb.points.familia.AccesoFamilia;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.stereotype.Service;

import java.time.Clock;
import java.time.Instant;
import java.util.List;
import java.util.Optional;

/**
 * Reglas de los deberes. Espejo de TaskService: requireMember con la familia de la RUTA antes de
 * leer o guardar; por id, ademas, el deber guardado tiene que ser de la familia Y del hijo de la ruta.
 */
@Service
public class DeberService {

    private final DeberRepository repository;
    private final ImportacionRepository importaciones;
    private final AccesoFamilia acceso;
    private final Clock clock;

    public DeberService(DeberRepository repository, ImportacionRepository importaciones,
                        AccesoFamilia acceso, Clock clock) {
        this.repository = repository;
        this.importaciones = importaciones;
        this.acceso = acceso;
        this.clock = clock;
    }

    public List<Deber> deHijo(String uid, String familyId, String hijoId, boolean soloActivos) {
        acceso.requireMember(uid, familyId);
        return soloActivos
                ? repository.findByFamilyIdAndHijoIdAndIsActiveTrue(familyId, hijoId)
                : repository.findByFamilyIdAndHijoId(familyId, hijoId);
    }

    /** familyId, hijoId, creador, clave y fechas salen de la ruta, del token y del reloj; nunca del cuerpo. */
    public Deber crear(String uid, String familyId, String hijoId, DeberCuerpo c) {
        // Se comprueba ANTES de guardar: crear en una familia ajena no deja rastro.
        acceso.requireMember(uid, familyId);
        Instant ahora = Instant.now(clock);
        Deber nuevo = new Deber(null, familyId, hijoId, uid, c.tipo(), c.asignatura(), c.fecha(), c.titulo(),
                c.enlace(), Deber.claveDe(c.tipo(), c.enlace(), c.examen()), c.detalle(), c.estado(),
                c.imprimir(), c.examen(), c.isActive(), ahora, ahora);
        try {
            return repository.save(nuevo);
        } catch (DuplicateKeyException e) {
            throw new DeberDuplicadoException();
        }
    }

    /**
     * Reemplaza los campos editables. La identidad no se toca: id, familia, hijo, creador, createdAt,
     * enlace y clave se conservan (cambiar el enlace cambiaria la clave y rompe la deduplicacion);
     * el examen de un MATERIAL tambien, porque es parte de su clave, y un cambio de tipo de o hacia
     * MATERIAL se ignora por la misma razon. Editar nunca desarchiva.
     */
    public Deber actualizar(String uid, String familyId, String hijoId, String id, DeberCuerpo c) {
        acceso.requireMember(uid, familyId);
        // Ser miembro de OTRA familia no basta: el guardado tiene que ser de la familia y el hijo de la ruta.
        Deber o = repository.findById(id)
                .filter(d -> familyId.equals(d.familyId()) && hijoId.equals(d.hijoId()))
                .orElseThrow(DeberNoEncontradoException::new);
        boolean material = o.tipo() == TipoDeber.MATERIAL || c.tipo() == TipoDeber.MATERIAL;
        TipoDeber tipo = material ? o.tipo() : c.tipo();
        String examen = o.tipo() == TipoDeber.MATERIAL ? o.examen() : c.examen();
        return repository.save(new Deber(o.id(), o.familyId(), o.hijoId(), o.createdBy(), tipo, c.asignatura(),
                c.fecha(), c.titulo(), o.enlace(), o.clave(), c.detalle(), c.estado(), c.imprimir(), examen,
                o.isActive() && c.isActive(), o.createdAt(), Instant.now(clock)));
    }

    public Importacion registrarImportacion(String uid, String familyId, String hijoId) {
        acceso.requireMember(uid, familyId);
        return importaciones.save(new Importacion(familyId + "/" + hijoId, familyId, hijoId, uid, Instant.now(clock)));
    }

    public Optional<Importacion> ultimaImportacion(String uid, String familyId, String hijoId) {
        acceso.requireMember(uid, familyId);
        return importaciones.findById(familyId + "/" + hijoId);
    }
}
