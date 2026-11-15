package es.cookyourweb.points.ia;

import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

/**
 * Calcula el perfil de colores a partir de las frecuencias respondidas.
 *
 * Es una funcion pura y determinista: el servidor decide el resultado, no el
 * cliente ni un modelo de IA. Por cada color suma las frecuencias de sus
 * afirmaciones y la compara con el maximo posible (2 por afirmacion).
 */
@Service
public class TipoService {

    private final ContenidoMetodoPort puerto;

    public TipoService(ContenidoMetodoPort puerto) {
        this.puerto = puerto;
    }

    public Perfil perfil(Map<String, Frecuencia> respuestas) {
        ContenidoTipo contenido = puerto.contenidoDeTipo();
        validar(contenido, respuestas);

        List<Perfil.NivelDeColor> niveles = new ArrayList<>();
        for (Color color : contenido.colores()) {
            int suma = 0;
            int max = 0;
            for (Afirmacion a : contenido.afirmaciones()) {
                if (a.colorId().equals(color.id())) {
                    suma += respuestas.get(a.id()).valor();
                    max += Frecuencia.A_MENUDO.valor();
                }
            }
            niveles.add(new Perfil.NivelDeColor(color, nivel(suma, max)));
        }
        return new Perfil(List.copyOf(niveles));
    }

    public List<Color> colores() {
        return puerto.contenidoDeTipo().colores();
    }

    public boolean esColorValido(String colorId) {
        return colorId != null && colores().stream().anyMatch(c -> c.id().equals(colorId));
    }

    private static Nivel nivel(int suma, int max) {
        if (suma == 0) {
            return Nivel.NADA;
        }
        return suma * 2 <= max ? Nivel.ALGO : Nivel.MUCHO;
    }

    private static void validar(ContenidoTipo contenido, Map<String, Frecuencia> respuestas) {
        List<String> problemas = new ArrayList<>();
        List<String> conocidos = contenido.afirmaciones().stream().map(Afirmacion::id).toList();
        for (String id : conocidos) {
            if (respuestas.get(id) == null) {
                problemas.add(id);
            }
        }
        for (String id : respuestas.keySet()) {
            if (!conocidos.contains(id)) {
                problemas.add(id);
            }
        }
        if (!problemas.isEmpty()) {
            throw new RespuestasInvalidasException(problemas);
        }
    }
}
