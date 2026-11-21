package es.cookyourweb.points.config;

import com.mongodb.MongoException;
import es.cookyourweb.points.deber.Deber;
import es.cookyourweb.points.familia.Membresia;
import es.cookyourweb.points.ia.EleccionTipo;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.index.IndexOperations;
import org.springframework.data.mongodb.core.index.MongoPersistentEntityIndexResolver;
import org.springframework.data.mongodb.core.mapping.MongoMappingContext;
import org.springframework.stereotype.Component;

import java.util.List;

/**
 * Crea los indices unicos de Membresia (uid, familyId), de EleccionTipo y de Deber (familyId, hijoId, clave)
 * al arrancar, SIN bloquear el arranque. Importacion no lleva indice: su _id ya es por hijo.
 *
 * Por que no spring.data.mongodb.auto-index-creation=true: esa propiedad crea los indices
 * dentro del arranque del contexto, y con Mongo caido el contexto no arranca tras ~30 s
 * (se midio: PointsApiApplicationTests pasaba de 9 s en verde a 31 s en rojo). Aqui se hace
 * en un hilo aparte: la app arranca aunque Mongo este caido (gotcha de AGENTS.md) y, si esta,
 * el indice existe en cuanto termina. createIndex es idempotente.
 *
 * Si Mongo estaba caido, el indice NO se crea hasta el siguiente arranque; es la misma
 * regla que ya tiene la API (levantar Mongo despues obliga a reiniciar el backend).
 */
@Component
public class IndicesMongo {

    private static final Logger log = LoggerFactory.getLogger(IndicesMongo.class);

    private final MongoTemplate mongo;
    private final MongoMappingContext contexto;

    public IndicesMongo(MongoTemplate mongo, MongoMappingContext contexto) {
        this.mongo = mongo;
        this.contexto = contexto;
    }

    @EventListener(ApplicationReadyEvent.class)
    void alArrancar() {
        Thread hilo = new Thread(this::crear, "indices-mongo");
        hilo.setDaemon(true);
        hilo.start();
    }

    void crear() {
        // Cada entidad en su propio try: si una falla (p. ej. duplicados), la otra igual se indexa.
        for (Class<?> entidad : List.of(Membresia.class, EleccionTipo.class, Deber.class)) {
            crearIndices(entidad);
        }
    }

    private void crearIndices(Class<?> entidad) {
        try {
            IndexOperations ops = mongo.indexOps(entidad);
            new MongoPersistentEntityIndexResolver(contexto)
                    .resolveIndexFor(entidad)
                    .forEach(ops::createIndex);
        } catch (RuntimeException e) {
            // La excepcion va como ultimo argumento para que el log lleve la traza entera.
            // Sin token ni datos de personas: solo el mensaje fijo y la excepcion del driver.
            if (esClaveDuplicada(e)) {
                log.warn("No se pudo crear el indice unico de {}: hay documentos duplicados "
                        + "(misma clave unica) que limpiar en Mongo antes del proximo arranque",
                        entidad.getSimpleName(), e);
            } else {
                log.warn("No se pudieron crear los indices de Mongo (reinicia la API con Mongo arriba)", e);
            }
        }
    }

    /** Clave duplicada = DuplicateKeyException de Spring o codigo 11000 del driver, en cualquier causa. */
    private static boolean esClaveDuplicada(Throwable e) {
        for (Throwable t = e; t != null; t = t.getCause()) {
            if (t instanceof DuplicateKeyException) return true;
            if (t instanceof MongoException m && m.getCode() == 11000) return true;
            if (t.getCause() == t) break;
        }
        return false;
    }
}
