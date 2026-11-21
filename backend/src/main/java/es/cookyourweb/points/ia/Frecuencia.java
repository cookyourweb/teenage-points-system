package es.cookyourweb.points.ia;

public enum Frecuencia {
    NUNCA(0), A_VECES(1), A_MENUDO(2);

    private final int valor;

    Frecuencia(int valor) {
        this.valor = valor;
    }

    public int valor() {
        return valor;
    }
}
