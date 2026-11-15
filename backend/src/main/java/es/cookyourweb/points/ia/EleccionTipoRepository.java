package es.cookyourweb.points.ia;

import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;
import java.util.Optional;

public interface EleccionTipoRepository extends MongoRepository<EleccionTipo, String> {

    Optional<EleccionTipo> findFirstByFamilyIdAndHijoIdAndUid(String familyId, String hijoId, String uid);

    List<EleccionTipo> findByFamilyIdAndHijoId(String familyId, String hijoId);
}
