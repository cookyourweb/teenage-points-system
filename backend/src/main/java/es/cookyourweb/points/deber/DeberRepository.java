package es.cookyourweb.points.deber;

import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;

/** Sin implementacion: Spring Data la genera leyendo el nombre de cada metodo. */
public interface DeberRepository extends MongoRepository<Deber, String> {

    List<Deber> findByFamilyIdAndHijoId(String familyId, String hijoId);

    List<Deber> findByFamilyIdAndHijoIdAndIsActiveTrue(String familyId, String hijoId);
}
