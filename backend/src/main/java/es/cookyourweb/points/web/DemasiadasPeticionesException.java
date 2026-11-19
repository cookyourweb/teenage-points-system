package es.cookyourweb.points.web;

import java.time.Duration;

/** Se paso el cupo de peticiones; lleva cuanto esperar para el Retry-After. */
public class DemasiadasPeticionesException extends RuntimeException {

    private final Duration espera;

    public DemasiadasPeticionesException(Duration espera) {
        super("demasiadas peticiones");
        this.espera = espera;
    }

    /** Segundos enteros redondeando hacia arriba, y al menos 1: reintentar antes seria otro 429. */
    public long segundos() {
        long s = espera.toSeconds() + (espera.toNanosPart() > 0 ? 1 : 0);
        return Math.max(1, s);
    }
}
