package es.cookyourweb.points.config;

import es.cookyourweb.points.familia.Membresia;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.index.IndexOperations;
import org.springframework.data.mongodb.core.index.MongoPersistentEntityIndexResolver;
import org.springframework.data.mongodb.core.mapping.MongoMappingContext;
import org.springframework.stereotype.Component;

/**
 * Crea el indice unico (uid, familyId) de Membresia al arrancar, SIN bloquear el arranque.
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
        try {
            IndexOperations ops = mongo.indexOps(Membresia.class);
            new MongoPersistentEntityIndexResolver(contexto)
                    .resolveIndexFor(Membresia.class)
                    .forEach(ops::createIndex);
        } catch (RuntimeException e) {
            log.warn("No se pudieron crear los indices de Mongo (reinicia la API con Mongo arriba): {}", e.getMessage());
        }
    }
}
