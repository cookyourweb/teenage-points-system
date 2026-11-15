package es.cookyourweb.points.ia;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.CompoundIndex;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;
import java.util.List;

/**
 * Los colores que UN adulto reconoce en UN hijo. Cada adulto guarda la suya por separado
 * (el indice unico familyId+hijoId+uid impide duplicados); el uid sale siempre del token.
 * "colores" se guarda en orden de definicion para poder comparar conjuntos entre adultos.
 */
@Document(collection = "eleccionesTipo")
@CompoundIndex(def = "{'familyId': 1, 'hijoId': 1, 'uid': 1}", unique = true)
public record EleccionTipo(
        @Id String id,
        String familyId,
        String hijoId,
        String uid,
        List<String> colores,
        String principal,
        Instant elegidaEn
) {
}
