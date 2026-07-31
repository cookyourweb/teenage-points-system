package es.cookyourweb.points.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.time.Clock;

/**
 * El reloj como dependencia inyectable.
 *
 * Sin esto, cualquier servicio que llame a Instant.now() por dentro es
 * imposible de testear con precision: no puedes afirmar nada sobre la fecha
 * que escribio. Con el Clock inyectado, un test puede fijarlo y comprobar
 * createdAt y updatedAt exactamente.
 */
@Configuration
public class ClockConfig {

    @Bean
    public Clock clock() {
        return Clock.systemUTC();
    }
}
