package es.cookyourweb.points.ia;

import java.util.List;

/** Respuesta del perfil: un nivel por color, sin descripciones ni ids de afirmaciones. */
public record PerfilPublico(List<ColorConNivel> colores) {

    public record ColorConNivel(String id, String nombre, Nivel nivel) {}

    public static PerfilPublico de(Perfil perfil) {
        return new PerfilPublico(perfil.colores().stream()
                .map(n -> new ColorConNivel(n.color().id(), n.color().nombre(), n.nivel())).toList());
    }
}
