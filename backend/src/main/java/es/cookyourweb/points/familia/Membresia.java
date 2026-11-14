package es.cookyourweb.points.familia;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.CompoundIndex;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;

/**
 * "Esta cuenta (uid) es de esta familia (familyId)".
 *
 * Es la unica fuente de verdad de la pertenencia en la API: el uid sale del
 * token verificado y nunca del cuerpo ni de la URL. El indice unico
 * (uid, familyId) impide duplicados aunque dos pestanas la creen a la vez.
 */
@Document(collection = "membresias")
@CompoundIndex(def = "{'uid': 1, 'familyId': 1}", unique = true)
public record Membresia(
        @Id String id,
        String uid,
        String familyId,
        Papel papel,
        EstadoMembresia estado,
        Instant creadaEn
) {
}
