package es.cookyourweb.points.web;

import ch.qos.logback.classic.Logger;
import ch.qos.logback.classic.spi.ILoggingEvent;
import ch.qos.logback.core.read.ListAppender;
import es.cookyourweb.points.familia.ServicioExternoException;
import org.junit.jupiter.api.Test;
import org.slf4j.LoggerFactory;

import static org.assertj.core.api.Assertions.assertThat;

/** El 502 deja rastro en el log, pero jamas con el token ni mensajes que lo puedan contener. */
class ManejadorDeErroresLogTest {

    @Test
    void el502DejaRastroSinElToken() {
        Logger logger = (Logger) LoggerFactory.getLogger(ManejadorDeErrores.class);
        ListAppender<ILoggingEvent> appender = new ListAppender<>();
        appender.start();
        logger.addAppender(appender);
        try {
            new ManejadorDeErrores().servicioExterno(new ServicioExternoException("x",
                    new IllegalStateException("Authorization: Bearer tok-secreto")));
        } finally {
            logger.detachAppender(appender);
        }

        assertThat(appender.list).hasSize(1);
        String linea = appender.list.get(0).getFormattedMessage();
        assertThat(linea).contains("IllegalStateException").doesNotContain("tok-secreto");
    }
}
