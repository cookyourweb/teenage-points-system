package es.cookyourweb.points.web;

import java.io.IOException;

/**
 * El cuerpo de la peticion supera el tope global. Es IOException a proposito: asi la
 * lanza el propio flujo de lectura y Spring la envuelve como cualquier fallo de lectura;
 * ManejadorDeErrores la busca en la cadena de causas y responde 413.
 */
public class CuerpoDemasiadoGrandeException extends IOException {

    public CuerpoDemasiadoGrandeException() {
        super("cuerpo de la peticion por encima del tope");
    }
}
