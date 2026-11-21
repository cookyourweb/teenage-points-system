package es.cookyourweb.points.config;

import ch.qos.logback.classic.Level;
import ch.qos.logback.classic.Logger;
import ch.qos.logback.classic.spi.ILoggingEvent;
import ch.qos.logback.core.read.ListAppender;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.mapping.MongoMappingContext;
import es.cookyourweb.points.deber.Deber;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/** El WARN de los indices tiene que decir la causa de verdad, no mandar a reiniciar a ciegas. */
class IndicesMongoTest {

    private final ListAppender<ILoggingEvent> registro = new ListAppender<>();
    private final Logger logger = (Logger) LoggerFactory.getLogger(IndicesMongo.class);
    private MongoTemplate mongo;
    private IndicesMongo indices;

    @BeforeEach
    void preparar() {
        registro.start();
        logger.addAppender(registro);
        mongo = mock(MongoTemplate.class);
        indices = new IndicesMongo(mongo, new MongoMappingContext());
    }

    @AfterEach
    void limpiar() {
        logger.detachAppender(registro);
    }

    @Test
    void conClaveDuplicadaAvisaDeMembresiasDuplicadasYNoDeReiniciar() {
        when(mongo.indexOps(any(Class.class))).thenThrow(new DuplicateKeyException("E11000 duplicate key"));

        indices.crear();

        ILoggingEvent aviso = registro.list.get(0);
        assertThat(aviso.getLevel()).isEqualTo(Level.WARN);
        assertThat(aviso.getFormattedMessage()).containsIgnoringCase("duplicad");
        assertThat(aviso.getFormattedMessage()).doesNotContainIgnoringCase("reinicia");
        assertThat(aviso.getThrowableProxy()).isNotNull();
    }

    @Test
    void creaElIndiceDeDeberes() {
        indices.crear();

        verify(mongo).indexOps(Deber.class);
    }

    @Test
    void conOtraCausaConservaLaExcepcionYSugiereReiniciar() {
        when(mongo.indexOps(any(Class.class))).thenThrow(new IllegalStateException("sin conexion"));

        indices.crear();

        ILoggingEvent aviso = registro.list.get(0);
        assertThat(aviso.getFormattedMessage()).containsIgnoringCase("reinicia");
        assertThat(aviso.getThrowableProxy()).isNotNull();
    }
}
