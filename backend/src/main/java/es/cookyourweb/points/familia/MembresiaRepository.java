package es.cookyourweb.points.familia;

import org.springframework.data.mongodb.repository.MongoRepository;

/** Spring Data genera la consulta a partir del nombre del metodo. */
public interface MembresiaRepository extends MongoRepository<Membresia, String> {

    /**
     * "First" a proposito: si ya hay duplicados (de antes del indice unico), findBy...
     * lanzaria IncorrectResultSizeDataAccessException y la persona veria un 500 para siempre.
     */
    java.util.Optional<Membresia> findFirstByUidAndFamilyId(String uid, String familyId);

    boolean existsByUidAndFamilyIdAndEstado(String uid, String familyId, EstadoMembresia estado);
}
