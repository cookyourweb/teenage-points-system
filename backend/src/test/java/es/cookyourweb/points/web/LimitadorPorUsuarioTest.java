package es.cookyourweb.points.web;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneId;
import java.time.ZoneOffset;

import static org.assertj.core.api.Assertions.assertThat;

class LimitadorPorUsuarioTest {

    private static final Instant T0 = Instant.parse("2026-11-19T10:00:00Z");

    /** Reloj que el test mueve a mano. */
    private static final class RelojMovil extends Clock {
        private Instant ahora = T0;

        @Override
        public ZoneId getZone() {
            return ZoneOffset.UTC;
        }

        @Override
        public Clock withZone(ZoneId zona) {
            return this;
        }

        @Override
        public Instant instant() {
            return ahora;
        }
    }

    @Test
    @DisplayName("con muchas claves, las ventanas caducadas se barren: la memoria no crece sin fin")
    void barreCaducadas() {
        RelojMovil reloj = new RelojMovil();
        LimitadorPorUsuario limitador = new LimitadorPorUsuario(reloj, 5, Duration.ofMinutes(10));
        for (int i = 0; i < LimitadorPorUsuario.BARRER_DESDE; i++) {
            limitador.intentar("uid-" + i);
        }
        assertThat(limitador.claves()).isEqualTo(LimitadorPorUsuario.BARRER_DESDE);

        reloj.ahora = T0.plus(Duration.ofMinutes(10));
        limitador.intentar("uid-nuevo");

        assertThat(limitador.claves()).isEqualTo(1);
    }

    @Test
    @DisplayName("Retry-After redondea hacia arriba y nunca es 0")
    void retryAfterRedondeaArriba() {
        assertThat(new DemasiadasPeticionesException(Duration.ofMillis(1500)).segundos()).isEqualTo(2);
        assertThat(new DemasiadasPeticionesException(Duration.ZERO).segundos()).isEqualTo(1);
    }
}
