package es.cookyourweb.points.deber;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;

/** Ultima importacion de un hijo: un documento por hijo, con id = familyId + "/" + hijoId. */
@Document("importaciones")
public record Importacion(@Id String id, String familyId, String hijoId, String uid, Instant en) {
}
