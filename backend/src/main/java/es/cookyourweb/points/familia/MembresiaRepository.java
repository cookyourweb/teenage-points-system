package es.cookyourweb.points.familia;

import org.springframework.data.mongodb.repository.MongoRepository;

/** Spring Data genera la consulta a partir del nombre del metodo. */
public interface MembresiaRepository extends MongoRepository<Membresia, String> {

    boolean existsByUidAndFamilyIdAndEstado(String uid, String familyId, EstadoMembresia estado);
}
