package es.cookyourweb.points.ia;

import java.util.List;

/** Un nivel por color, en el orden en que se definen los colores (es una mezcla, no un tipo unico). */
public record Perfil(List<NivelDeColor> colores) {

    public record NivelDeColor(Color color, Nivel nivel) {}
}
