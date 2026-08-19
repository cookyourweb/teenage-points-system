import React, { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faShare, faCopy, faQrcode, faEye } from '@fortawesome/free-solid-svg-icons';
import Button from './ui/Button';
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

      <Modal isOpen={showModal} onClose={() => setShowModal(false)}>
        <div className="space-y-6 max-w-2xl">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100 mb-2">
              Compartir Sistema de Puntos
            </h2>
            <p className="text-neutral-600 dark:text-neutral-400">
              Comparte el progreso de {child.nombre} con diferentes niveles de acceso
            </p>
          </div>

          {/* Vista para el Hijo */}
          <div className="bg-primary-50 dark:bg-primary-900/20 p-4 rounded-lg">
            <div className="flex items-center gap-3 mb-3">
              <FontAwesomeIcon icon={faEye} className="text-primary-500" />
              <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
                Vista para {child.nombre}
              </h3>
            </div>
            <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-4">
              Enlace simplificado donde {child.nombre} puede ver sus puntos y progreso 
              (solo lectura, interfaz amigable para niños)
            </p>
            
            <div className="space-y-3">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={childViewLink}
                  readOnly
                  className="flex-1 p-2 text-sm border border-neutral-300 dark:border-neutral-600 rounded bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100"
                />
                <Button variant="primary"
                  onClick={() => copyToClipboard(childViewLink)}
                >
                  <FontAwesomeIcon icon={faCopy} />
                </Button>
              </div>
              
              <div className="flex gap-2">
                <Button variant="primary" size="sm" layout="grow"
                  onClick={() => shareViaWebAPI(childViewLink, `Puntos de ${child.nombre}`)}
                >
                  <FontAwesomeIcon icon={faShare} className="mr-2" />
                  Compartir Enlace
                </Button>
                <Button variant="primary"
                  onClick={() => window.open(childViewLink, '_blank')}
                >
                  <FontAwesomeIcon icon={faEye} />
                </Button>
              </div>

              {/* QR Code para el hijo */}
              <div className="text-center">
                <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-2">
                  Código QR para {child.nombre}
                </p>
                <img
                  src={generateQRCode(childViewLink)}
                  alt={`QR Code para ${child.nombre}`}
                  className="mx-auto border border-neutral-200 dark:border-neutral-700 rounded"
                />
              </div>
            </div>
          </div>

          {/* Vista para Padres/Administradores */}
          <div className="bg-warning-50 dark:bg-warning-900/20 p-4 rounded-lg">
            <div className="flex items-center gap-3 mb-3">
              <FontAwesomeIcon icon={faQrcode} className="text-warning-500" />
              <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
                Vista Completa (Padres)
              </h3>
            </div>
            <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-4">
              Enlace completo con capacidad de editar tareas y gestionar privilegios
            </p>
            
            <div className="space-y-3">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={adminLink}
                  readOnly
                  className="flex-1 p-2 text-sm border border-neutral-300 dark:border-neutral-600 rounded bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100"
                />
                <Button variant="primary"
                  onClick={() => copyToClipboard(adminLink)}
                >
                  <FontAwesomeIcon icon={faCopy} />
                </Button>
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
          <div className="bg-neutral-50 dark:bg-neutral-800 p-4 rounded-lg">
            <h4 className="font-semibold text-neutral-900 dark:text-neutral-100 mb-2">
              💡 Consejos de uso:
            </h4>
            <ul className="text-sm text-neutral-600 dark:text-neutral-400 space-y-2">
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
            <div className="bg-success-100 dark:bg-success-900/20 border border-success-300 dark:border-success-700 text-success-800 dark:text-success-200 px-4 py-3 rounded-lg text-center">
              <FontAwesomeIcon icon={faCopy} className="mr-2" />
              ¡Enlace copiado al portapapeles!
            </div>
          )}

          {/* Botones de acción */}
          <div className="flex justify-end gap-2 pt-4 border-t border-neutral-200 dark:border-neutral-700">
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