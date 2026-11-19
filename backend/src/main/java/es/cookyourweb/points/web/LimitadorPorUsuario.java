package es.cookyourweb.points.web;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Ventana fija por clave (el uid): como mucho {@code maximo} peticiones cada {@code ventana}.
 *
 * Ventana fija y no token bucket: es lo mas simple de razonar y de testear, y el defecto
 * conocido (hasta 2x maximo justo en el borde entre dos ventanas) no importa aqui: lo que
 * se protege es que deducir el mapa o gastar IA no sea gratis, no un caudal exacto.
 *
 * LIMITE CONOCIDO: vive en memoria, es POR INSTANCIA. Con varias instancias (AWS Lambda
 * escala asi) el limite efectivo se multiplica por el numero de instancias, y un arranque
 * en frio lo reinicia. La solucion cuando haga falta: un almacen compartido (p. ej. un
 * contador con TTL en Mongo/DynamoDB) o el throttling por clave del API Gateway.
 *
 * Usa el Clock inyectado: nada de Instant.now(), asi el test controla el tiempo.
 */
public class LimitadorPorUsuario {

    /** A partir de cuantas claves se barren las ventanas caducadas: la memoria no crece sin fin. */
    static final int BARRER_DESDE = 10_000;

    private record Ventana(Instant inicio, int usadas) {}

    private final Clock reloj;
    private final int maximo;
    private final Duration ventana;
    private final ConcurrentHashMap<String, Ventana> ventanas = new ConcurrentHashMap<>();

    public LimitadorPorUsuario(Clock reloj, int maximo, Duration ventana) {
        this.reloj = reloj;
        this.maximo = maximo;
        this.ventana = ventana;
    }

    /** Vacio si la peticion entra (y la cuenta); si no, cuanto falta para que se abra la ventana. */
    public Optional<Duration> intentar(String clave) {
        Instant ahora = reloj.instant();
        if (ventanas.size() >= BARRER_DESDE) {
            ventanas.values().removeIf(v -> caducada(v, ahora));
        }
        // compute es atomico por clave: dos peticiones simultaneas del mismo uid no se cuelan.
        Ventana v = ventanas.compute(clave, (k, actual) -> {
            if (actual == null || caducada(actual, ahora)) {
                return new Ventana(ahora, 1);
            }
            return actual.usadas() > maximo ? actual : new Ventana(actual.inicio(), actual.usadas() + 1);
        });
        if (v.usadas() <= maximo) {
            return Optional.empty();
        }
        return Optional.of(Duration.between(ahora, v.inicio().plus(ventana)));
    }

    int claves() {
        return ventanas.size();
    }

    private boolean caducada(Ventana v, Instant ahora) {
        return !ahora.isBefore(v.inicio().plus(ventana));
    }
}
