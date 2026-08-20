import React, { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faShare, faCopy, faQrcode, faEye } from '@fortawesome/free-solid-svg-icons';
import Button from './ui/Button';
import Field from './ui/Field';
import Modal from './ui/Modal';
import { Child } from '../types/familyTypes';

interface ShareChildLinkProps {
  child: Child;
  familyId: string;
}

const ShareChildLink: React.FC<ShareChildLinkProps> = ({ child, familyId }) => {
  const [showModal, setShowModal] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);

  // Generar el enlace para la vista del hijo
  const childViewLink = `${window.location.origin}/child-view/${familyId}/${child.id}`;
  
  // Generar el enlace para el sistema completo (padres)
  const adminLink = `${window.location.origin}/reward-tracker/${familyId}/${child.id}`;

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (err) {
      console.error('Error copying to clipboard:', err);
      // Fallback para navegadores que no soportan clipboard API
      const textArea = document.createElement('textarea');
      textArea.value = text;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    }
  };

  const generateQRCode = (text: string) => {
    // Usar un servicio gratuito para generar QR codes
    return `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(text)}`;
  };

  const shareViaWebAPI = async (text: string, title: string) => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: title,
          text: `Mira los puntos de ${child.nombre}`,
          url: text,
        });
      } catch (err) {
        console.error('Error sharing:', err);
      }
    } else {
      // Fallback: copiar al portapapeles
      copyToClipboard(text);
    }
  };

  return (
    <>
      <Button variant="primary" size="sm"
        onClick={() => setShowModal(true)}
      >
        <FontAwesomeIcon icon={faShare} />
        Compartir
      </Button>

      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title="Compartir Sistema de Puntos"
      >
        <div className="space-y-6 max-w-2xl">
          <div className="text-center">
            <p className="text-content-muted">
              Comparte el progreso de {child.nombre} con diferentes niveles de acceso
            </p>
          </div>

          {/* Vista para el Hijo */}
          <div className="bg-primary-50 dark:bg-primary-900/20 p-4 rounded-lg">
            <div className="flex items-center gap-3 mb-3">
              <FontAwesomeIcon icon={faEye} className="text-primary-500" />
              <h3 className="text-lg font-semibold text-content">
                Vista para {child.nombre}
              </h3>
            </div>
            <p className="text-sm mb-4 text-content-muted">
              Enlace simplificado donde {child.nombre} puede ver sus puntos y progreso 
              (solo lectura, interfaz amigable para niños)
            </p>
            
            <div className="space-y-3">
              <div className="flex gap-2">
                <div className="flex-1">
                  <Field
                    label="Enlace de la vista del hijo"
                    labelHidden
                    name="childviewlink"
                    type="text"
                    value={childViewLink}
                    readOnly
                  />
                </div>
                <Button
                  variant="primary"
                  onClick={() => copyToClipboard(childViewLink)}
                  iconOnly={<FontAwesomeIcon icon={faCopy} />}
                  label="Copiar el enlace de la vista del hijo"
                />
              </div>
              
              <div className="flex gap-2">
                <Button variant="primary" size="sm" layout="grow"
                  onClick={() => shareViaWebAPI(childViewLink, `Puntos de ${child.nombre}`)}
                >
                  <FontAwesomeIcon icon={faShare} className="mr-2" />
                  Compartir Enlace
                </Button>
                <Button
                  variant="primary"
                  onClick={() => window.open(childViewLink, '_blank')}
                  iconOnly={<FontAwesomeIcon icon={faEye} />}
                  label="Abrir la vista del hijo en una pestaña nueva"
                />
              </div>

              {/* QR Code para el hijo */}
              <div className="text-center">
                <p className="text-xs mb-2 text-content-muted">
                  Código QR para {child.nombre}
                </p>
                <img
                  src={generateQRCode(childViewLink)}
                  alt={`QR Code para ${child.nombre}`}
                  className="mx-auto border rounded border-line"
                />
              </div>
            </div>
          </div>

          {/* Vista para Padres/Administradores */}
          <div className="p-4 rounded-lg bg-caution-bg">
            <div className="flex items-center gap-3 mb-3">
              <FontAwesomeIcon icon={faQrcode} className="text-warning-500" />
              <h3 className="text-lg font-semibold text-content">
                Vista Completa (Padres)
              </h3>
            </div>
            <p className="text-sm mb-4 text-content-muted">
              Enlace completo con capacidad de editar tareas y gestionar privilegios
            </p>
            
            <div className="space-y-3">
              <div className="flex gap-2">
                <div className="flex-1">
                  <Field
                    label="Enlace de administración"
                    labelHidden
                    name="adminlink"
                    type="text"
                    value={adminLink}
                    readOnly
                  />
                </div>
                <Button
                  variant="primary"
                  onClick={() => copyToClipboard(adminLink)}
                  iconOnly={<FontAwesomeIcon icon={faCopy} />}
                  label="Copiar el enlace de administración"
                />
              </div>
              
              <Button variant="primary" size="sm" layout="full"
                onClick={() => window.open(adminLink, '_blank')}
              >
                <FontAwesomeIcon icon={faEye} className="mr-2" />
                Abrir Vista Completa
              </Button>
            </div>
          </div>

          {/* Instrucciones */}
          <div className="p-4 rounded-lg bg-surface-sunken">
            <h4 className="font-semibold mb-2 text-content">
              💡 Consejos de uso:
            </h4>
            <ul className="text-sm space-y-2 text-content-muted">
              <li className="flex items-start gap-2">
                <span className="text-primary-500 mt-1">•</span>
                <span>
                  <strong>Para {child.nombre}:</strong> Usa el enlace azul o el código QR. 
                  Podrá ver sus puntos y progreso de forma visual y motivadora.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-warning-500 mt-1">•</span>
                <span>
                  <strong>Para otros padres:</strong> Usa el enlace naranja para que puedan 
                  ayudar a gestionar las tareas y privilegios.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-success-500 mt-1">•</span>
                <span>
                  <strong>Compartir:</strong> Los enlaces funcionan en cualquier dispositivo 
                  sin necesidad de crear cuenta para la vista del hijo.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-accent-500 mt-1">•</span>
                <span>
                  <strong>Seguridad:</strong> Los enlaces son únicos y seguros. Solo quien 
                  tenga el enlace puede acceder a los datos del niño.
                </span>
              </li>
            </ul>
          </div>

          {/* Estado de copia */}
          {copySuccess && (
            <div className="bg-success-100 dark:bg-success-900/20 border border-success-300 dark:border-success-700 px-4 py-3 rounded-lg text-center text-positive-text">
              <FontAwesomeIcon icon={faCopy} className="mr-2" />
              ¡Enlace copiado al portapapeles!
            </div>
          )}

          {/* Botones de acción */}
          <div className="flex justify-end gap-2 pt-4 border-t border-line">
            <Button variant="neutral"
              onClick={() => setShowModal(false)}
            >
              Cerrar
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
};

export default ShareChildLink;