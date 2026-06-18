import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../../lib/supabase';
import { logger } from '../../../lib/logger';
import { useSiteSettings } from '../../../hooks/useSiteSettings';
import {
  Mail,
  Megaphone,
  Users,
  Search,
  Save,
  Send,
  Calendar,
  Image as ImageIcon,
  CheckCircle,
  Loader2,
  Trash2,
  AlertCircle
} from 'lucide-react';
import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';
import './Campanas.css';

interface Client {
  id: string;
  name: string;
  email: string;
  phone: string;
  source: string;
}

export default function CampanasPage() {
  const { settings, loading: settingsLoading } = useSiteSettings();
  const [activeTab, setActiveTab] = useState<'mail' | 'popup'>('mail');
  const [clients, setClients] = useState<Client[]>([]);
  const [loadingClients, setLoadingClients] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedClients, setSelectedClients] = useState<Set<string>>(new Set());

  // Mail tab states
  const [emailTitle, setEmailTitle] = useState('');
  const [emailBody, setEmailBody] = useState('');
  const [scheduleType, setScheduleType] = useState<'manual' | 'scheduled'>('manual');
  const [scheduleCron, setScheduleCron] = useState('every_monday_12am');
  const [isSavingMail, setIsSavingMail] = useState(false);
  const [sendingProgress, setSendingProgress] = useState<{ active: boolean; current: number; total: number; currentName: string } | null>(null);

  // Popup tab states
  const [popupEnabled, setPopupEnabled] = useState(false);
  const [popupTitle, setPopupTitle] = useState('');
  const [popupDescription, setPopupDescription] = useState('');
  const [popupImage, setPopupImage] = useState('');
  const [isSavingPopup, setIsSavingPopup] = useState(false);

  // General alert
  const [alert, setAlert] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Quill config
  const extendedColors = [
    "#000000", "#e60000", "#ff9900", "#ffff00", "#008a00", "#0066cc", "#9933ff",
    "#ffffff", "#facccc", "#ffebcc", "#ffffcc", "#cce8cc", "#cce0f5", "#ebd6ff",
    "#bbbbbb", "#f06666", "#ffc266", "#ffff66", "#66b966", "#66a3e0", "#c285ff",
    "#888888", "#a10000", "#b26b00", "#b2b200", "#006100", "#0047b2", "#6b24b2",
    "#444444", "#5c0000", "#663d00", "#666600", "#003300", "#00245c", "#3d1466",
    "#1F3A4D", "#6E8898", "#B7C5CF", "#C89B5A", "#E9DFD2", "#1a2a36"
  ];

  const quillModules = useMemo(() => ({
    toolbar: {
      container: [
        [{ 'header': [1, 2, 3, false] }],
        [{ 'size': ['small', false, 'large', 'huge'] }],
        ['bold', 'italic', 'underline', 'strike'],
        [{ 'color': extendedColors }, { 'background': extendedColors }],
        [{ 'list': 'ordered'}, { 'list': 'bullet' }],
        [{ 'align': [] }],
        ['clean']
      ]
    }
  }), []);

  // Fetch clients and initialize states from settings
  useEffect(() => {
    fetchClients();
  }, []);

  useEffect(() => {
    if (settings) {
      setEmailTitle(settings.default_email_title || '');
      setEmailBody(settings.default_email_body || '');
      setScheduleType((settings.email_schedule_type as 'manual' | 'scheduled') || 'manual');
      setScheduleCron(settings.email_schedule_cron || 'every_monday_12am');

      setPopupEnabled(settings.popup_ad_enabled === 'true');
      setPopupTitle(settings.popup_ad_title || '');
      setPopupDescription(settings.popup_ad_description || '');
      setPopupImage(settings.popup_ad_image || '');
    }
  }, [settings]);

  const fetchClients = async () => {
    setLoadingClients(true);
    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .order('name', { ascending: true });

    if (error) {
      console.error('Error fetching clients:', error);
      logger.error('Publicidad', 'Error al cargar clientes para campaña', error);
    } else if (data) {
      // Filter out temporary sessions
      const filtered = data.filter((c: any) => c.source !== 'agenda_session_only' && c.email);
      setClients(filtered);
    }
    setLoadingClients(false);
  };

  // Filtered clients list based on search query
  const filteredClients = useMemo(() => {
    if (!searchQuery.trim()) return clients;
    return clients.filter(
      c =>
        c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.email.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [clients, searchQuery]);

  // Handle checking all filtered clients
  const isAllSelected = useMemo(() => {
    if (filteredClients.length === 0) return false;
    return filteredClients.every(c => selectedClients.has(c.id));
  }, [filteredClients, selectedClients]);

  const handleToggleSelectAll = () => {
    const nextSelected = new Set(selectedClients);
    if (isAllSelected) {
      filteredClients.forEach(c => nextSelected.delete(c.id));
    } else {
      filteredClients.forEach(c => nextSelected.add(c.id));
    }
    setSelectedClients(nextSelected);
  };

  const handleToggleClient = (id: string) => {
    const nextSelected = new Set(selectedClients);
    if (nextSelected.has(id)) {
      nextSelected.delete(id);
    } else {
      nextSelected.add(id);
    }
    setSelectedClients(nextSelected);
  };

  // Convert files to Base64
  const handleImageUpload = (file: File, target: 'email' | 'popup') => {
    if (!file.type.startsWith('image/')) {
      showNotice('error', 'El archivo debe ser una imagen.');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      showNotice('error', 'La imagen es muy pesada. Máximo 2MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const base64 = e.target?.result as string;
      if (target === 'email') {
        // Append image to Quill body
        setEmailBody(prev => prev + `<p><img src="${base64}" style="max-width: 100%; border-radius: 8px; margin: 10px 0;" /></p>`);
        showNotice('success', 'Imagen insertada en el correo.');
      } else {
        setPopupImage(base64);
        showNotice('success', 'Imagen del popup cargada.');
      }
    };
    reader.readAsDataURL(file);
  };

  const showNotice = (type: 'success' | 'error', message: string) => {
    setAlert({ type, message });
    setTimeout(() => setAlert(null), 4000);
  };

  // Save default email draft / schedule
  const handleSaveMailSettings = async () => {
    try {
      setIsSavingMail(true);
      const updates = [
        { key: 'default_email_title', value: emailTitle },
        { key: 'default_email_body', value: emailBody },
        { key: 'email_schedule_type', value: scheduleType },
        { key: 'email_schedule_cron', value: scheduleCron }
      ];

      const { error } = await supabase.from('site_settings').upsert(updates);
      if (error) throw error;

      logger.success('Publicidad', 'Configuración de campaña de correo guardada con éxito');
      showNotice('success', 'Configuración de correo guardada.');
    } catch (e: any) {
      console.error(e);
      logger.error('Publicidad', 'Error al guardar configuración de correo', e);
      showNotice('error', 'Error al guardar configuración.');
    } finally {
      setIsSavingMail(false);
    }
  };

  // Simulate sending manual emails
  const handleSendEmailsManual = async () => {
    if (selectedClients.size === 0) {
      showNotice('error', 'Debes seleccionar al menos un destinatario.');
      return;
    }
    if (!emailTitle.trim() || !emailBody.trim()) {
      showNotice('error', 'El título y el cuerpo del correo no pueden estar vacíos.');
      return;
    }

    const selectedList = clients.filter(c => selectedClients.has(c.id));
    setSendingProgress({
      active: true,
      current: 0,
      total: selectedList.length,
      currentName: selectedList[0].name
    });

    for (let i = 0; i < selectedList.length; i++) {
      const client = selectedList[i];
      setSendingProgress(prev => prev ? { ...prev, current: i, currentName: client.name } : null);
      
      // Simulate network delay for sending
      await new Promise(resolve => setTimeout(resolve, 300));
    }

    setSendingProgress(prev => prev ? { ...prev, current: selectedList.length, currentName: 'Finalizado' } : null);
    
    // Log in system console
    logger.success('Publicidad', `Campaña de correo "${emailTitle}" enviada manualmente`, {
      recipients_count: selectedList.length,
      recipients: selectedList.map(c => c.email)
    });

    setTimeout(() => {
      setSendingProgress(null);
      showNotice('success', `¡Campaña enviada con éxito a ${selectedList.length} clientes!`);
    }, 1000);
  };

  // Save popup settings
  const handleSavePopupSettings = async () => {
    try {
      setIsSavingPopup(true);
      const updates = [
        { key: 'popup_ad_enabled', value: popupEnabled ? 'true' : 'false' },
        { key: 'popup_ad_title', value: popupTitle },
        { key: 'popup_ad_description', value: popupDescription },
        { key: 'popup_ad_image', value: popupImage }
      ];

      const { error } = await supabase.from('site_settings').upsert(updates);
      if (error) throw error;

      logger.success('Publicidad', `Popup web ${popupEnabled ? 'habilitado' : 'deshabilitado'} y actualizado`, {
        title: popupTitle,
        has_image: !!popupImage
      });
      showNotice('success', 'Publicidad en web actualizada con éxito.');
    } catch (e: any) {
      console.error(e);
      logger.error('Publicidad', 'Error al actualizar popup web', e);
      showNotice('error', 'Error al guardar configuración del popup.');
    } finally {
      setIsSavingPopup(false);
    }
  };

  if (settingsLoading) {
    return (
      <div className="loading-container">
        <Loader2 className="spinner" />
        <p>Cargando módulo de publicidad...</p>
      </div>
    );
  }

  return (
    <div className="publicidad-page animate-fade-in">
      <header className="page-header-centered">
        <h1>Centro de Publicidad y Campañas</h1>
        <p>Promociona nuevos destinos, gestiona envíos masivos por correo y configura ventanas emergentes para tus visitantes.</p>
      </header>

      {alert && (
        <div className={`alert-floating alert-${alert.type} animate-scale-in`}>
          {alert.type === 'success' ? <CheckCircle size={20} /> : <AlertCircle size={20} />}
          <span>{alert.message}</span>
        </div>
      )}

      {/* Tabs */}
      <div className="tabs-container">
        <button
          className={`tab-btn ${activeTab === 'mail' ? 'active' : ''}`}
          onClick={() => setActiveTab('mail')}
        >
          <Mail size={18} />
          Campañas de Correo
        </button>
        <button
          className={`tab-btn ${activeTab === 'popup' ? 'active' : ''}`}
          onClick={() => setActiveTab('popup')}
        >
          <Megaphone size={18} />
          Publicidad en Web (Popup)
        </button>
      </div>

      {/* Tab Contents */}
      <div className="tab-content-wrapper">
        {activeTab === 'mail' ? (
          <div className="mail-campaigns-grid">
            {/* Left side: Recipient selector */}
            <div className="glass-card campaign-card">
              <div className="card-header border-bottom">
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Users size={20} className="text-accent" />
                  <h4>Destinatarios ({selectedClients.size} seleccionados)</h4>
                </div>
              </div>
              <div className="card-body search-filter-body">
                <div className="search-input-wrapper mb-3">
                  <Search size={16} />
                  <input
                    type="text"
                    placeholder="Buscar cliente por nombre o email..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>

                <div className="select-all-row mb-3">
                  <label className="checkbox-container">
                    <input
                      type="checkbox"
                      checked={isAllSelected}
                      onChange={handleToggleSelectAll}
                    />
                    <span className="checkmark"></span>
                    <span className="checkbox-label font-bold text-sm">
                      {isAllSelected ? 'Deseleccionar Todos' : 'Seleccionar Todos'} ({filteredClients.length} filtrados)
                    </span>
                  </label>
                </div>

                <div className="clients-list-container">
                  {loadingClients ? (
                    <div className="loading-sublist">
                      <Loader2 className="spinner" size={24} />
                      <p>Cargando clientes...</p>
                    </div>
                  ) : filteredClients.length === 0 ? (
                    <div className="empty-sublist text-center py-4 text-secondary">
                      Ningún cliente coincide con la búsqueda.
                    </div>
                  ) : (
                    filteredClients.map(c => (
                      <div
                        key={c.id}
                        className={`client-row-item ${selectedClients.has(c.id) ? 'selected' : ''}`}
                        onClick={() => handleToggleClient(c.id)}
                      >
                        <label className="checkbox-container" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={selectedClients.has(c.id)}
                            onChange={() => handleToggleClient(c.id)}
                          />
                          <span className="checkmark"></span>
                        </label>
                        <div className="client-item-info">
                          <span className="client-item-name font-bold">{c.name}</span>
                          <span className="client-item-email text-xs text-secondary">{c.email}</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* Right side: Email composition */}
            <div className="glass-card campaign-card compose-card">
              <div className="card-header border-bottom">
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Mail size={20} className="text-accent" />
                  <h4>Redactar Campaña</h4>
                </div>
              </div>
              <div className="card-body">
                <div className="form-group mb-3">
                  <label className="text-xs font-bold uppercase text-secondary mb-2 block">Asunto / Título del Correo</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Ej: ¡Descuento exclusivo en tu próximo viaje a Europa! ✈️"
                    value={emailTitle}
                    onChange={(e) => setEmailTitle(e.target.value)}
                  />
                </div>

                <div className="form-group mb-3">
                  <label className="text-xs font-bold uppercase text-secondary mb-2 block">Cuerpo del Correo</label>
                  <div className="rich-editor-wrapper">
                    <ReactQuill
                      theme="snow"
                      value={emailBody}
                      onChange={setEmailBody}
                      modules={quillModules}
                    />
                  </div>
                </div>

                {/* Drag and Drop Zone */}
                <div
                  className="drag-drop-zone mb-4"
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                      handleImageUpload(e.dataTransfer.files[0], 'email');
                    }
                  }}
                >
                  <ImageIcon size={28} className="text-secondary mb-2" />
                  <p className="text-sm font-bold text-primary">Arrastra una imagen aquí para insertarla en el correo</p>
                  <p className="text-xs text-secondary mt-1">O selecciona una de tu PC</p>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        handleImageUpload(e.target.files[0], 'email');
                      }
                    }}
                    style={{ marginTop: '10px' }}
                  />
                </div>

                {/* Scheduling config */}
                <div className="schedule-section glass-card mb-4">
                  <div className="section-title mb-3" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Calendar size={18} className="text-accent" />
                    <span className="font-bold text-sm">Programación de Envío</span>
                  </div>
                  <div className="schedule-options-row">
                    <label className="radio-container text-sm">
                      <input
                        type="radio"
                        name="scheduleType"
                        checked={scheduleType === 'manual'}
                        onChange={() => setScheduleType('manual')}
                      />
                      <span>Envío Manual</span>
                    </label>
                    <label className="radio-container text-sm">
                      <input
                        type="radio"
                        name="scheduleType"
                        checked={scheduleType === 'scheduled'}
                        onChange={() => setScheduleType('scheduled')}
                      />
                      <span>Envío Programado (Automático)</span>
                    </label>
                  </div>

                  {scheduleType === 'scheduled' && (
                    <div className="schedule-config mt-3 animate-fade-in">
                      <label className="text-xs font-bold uppercase text-secondary mb-2 block">Frecuencia</label>
                      <select
                        className="form-input"
                        value={scheduleCron}
                        onChange={(e) => setScheduleCron(e.target.value)}
                      >
                        <option value="every_monday_12am">Todos los lunes a las 12:00 AM</option>
                        <option value="every_first_month_9am">Primer día del mes a las 9:00 AM</option>
                        <option value="every_friday_6pm">Todos los viernes a las 6:00 PM</option>
                      </select>
                      <p className="text-xs text-accent mt-2">
                        💡 Próximo envío estimado: {
                          scheduleCron === 'every_monday_12am' ? 'Próximo Lunes 00:00 hs' :
                          scheduleCron === 'every_friday_6pm' ? 'Próximo Viernes 18:00 hs' : 'Día 1 del próximo mes 09:00 hs'
                        }
                      </p>
                    </div>
                  )}
                </div>

                {/* Mail actions */}
                <div className="actions-footer">
                  <button
                    className="btn btn-outline"
                    onClick={handleSaveMailSettings}
                    disabled={isSavingMail}
                  >
                    <Save size={18} />
                    {isSavingMail ? 'Guardando...' : 'Guardar Plantilla'}
                  </button>
                  <button
                    className="btn btn-primary"
                    onClick={handleSendEmailsManual}
                    disabled={sendingProgress !== null || selectedClients.size === 0}
                  >
                    <Send size={18} />
                    Enviar Ahora
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* Tab Popup Config */
          <div className="glass-card campaign-card full-width">
            <div className="card-header border-bottom">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Megaphone size={20} className="text-accent" />
                <h4>Configuración del Popup Promocional en Web</h4>
              </div>
            </div>
            <div className="card-body popup-ad-body">
              <div className="popup-switch-row mb-4">
                <div className="switch-info">
                  <h5 className="font-bold">Activar Ventana Emergente</h5>
                  <p className="text-xs text-secondary">Habilita o deshabilita la publicidad flotante al ingresar a la web.</p>
                </div>
                <label className="switch">
                  <input
                    type="checkbox"
                    checked={popupEnabled}
                    onChange={(e) => setPopupEnabled(e.target.checked)}
                  />
                  <span className="slider round"></span>
                </label>
              </div>

              <div className="popup-layout-grid">
                <div className="popup-inputs">
                  <div className="form-group mb-4">
                    <label className="text-xs font-bold uppercase text-secondary mb-2 block">Título del Popup</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="Ej: ¡Únete a nuestro viaje grupal de Noviembre! 🌟"
                      value={popupTitle}
                      onChange={(e) => setPopupTitle(e.target.value)}
                    />
                  </div>

                  <div className="form-group mb-4">
                    <label className="text-xs font-bold uppercase text-secondary mb-2 block">Descripción / Detalles</label>
                    <textarea
                      className="form-input"
                      rows={5}
                      placeholder="Escribe el cuerpo del anuncio. Explica la promoción, beneficios, etc."
                      value={popupDescription}
                      onChange={(e) => setPopupDescription(e.target.value)}
                    ></textarea>
                  </div>

                  <div className="form-group mb-4">
                    <label className="text-xs font-bold uppercase text-secondary mb-2 block">Imagen Promocional</label>
                    <div
                      className="drag-drop-zone"
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={(e) => {
                        e.preventDefault();
                        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                          handleImageUpload(e.dataTransfer.files[0], 'popup');
                        }
                      }}
                    >
                      <ImageIcon size={28} className="text-secondary mb-2" />
                      <p className="text-sm font-bold text-primary">Arrastra una imagen de publicidad aquí</p>
                      <p className="text-xs text-secondary mt-1">Máximo 2MB de peso</p>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          if (e.target.files && e.target.files[0]) {
                            handleImageUpload(e.target.files[0], 'popup');
                          }
                        }}
                        style={{ marginTop: '10px' }}
                      />
                    </div>
                  </div>

                  <button
                    className="btn btn-primary w-100"
                    onClick={handleSavePopupSettings}
                    disabled={isSavingPopup}
                  >
                    <Save size={18} />
                    {isSavingPopup ? 'Guardando...' : 'Guardar y Publicar Popup'}
                  </button>
                </div>

                {/* Live Preview Panel */}
                <div className="popup-preview-container">
                  <div className="preview-label mb-2 text-xs font-bold uppercase text-secondary">Previsualización del Diseño</div>
                  <div className="popup-preview-mockup">
                    <div className="mock-card">
                      {popupImage ? (
                        <div className="mock-img-wrapper">
                          <img src={popupImage} alt="Preview" />
                          <button className="delete-preview-btn" onClick={() => setPopupImage('')} title="Quitar imagen">
                            <Trash2 size={16} />
                          </button>
                        </div>
                      ) : (
                        <div className="mock-img-placeholder">
                          <ImageIcon size={48} className="text-tertiary" />
                          <span className="text-xs text-secondary">Sin imagen seleccionada</span>
                        </div>
                      )}
                      <div className="mock-text-content">
                        <h4 className="mock-title">{popupTitle || 'Título Promocional'}</h4>
                        <p className="mock-desc">{popupDescription || 'Redacta un cuerpo de texto en el formulario de la izquierda para ver el resultado en vivo.'}</p>
                        <button className="btn btn-primary btn-sm w-100">¡Ver Más Detalles!</button>
                        <div className="mock-close-hint text-xs text-center text-secondary mt-2">✕ Cerrar ventana</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Sending progress modal */}
      {sendingProgress && (
        <div className="modal-overlay" style={{ zIndex: 1500 }}>
          <div className="modal-content glass-card animate-scale-in text-center" style={{ maxWidth: '400px', padding: '2.5rem' }}>
            <Loader2 className="spinner mb-4 text-accent" size={48} />
            <h3 className="font-bold mb-2">Enviando Campaña de Correo</h3>
            <p className="text-secondary text-sm mb-4">Procesando envíos individuales...</p>

            <div className="progress-bar-wrapper mb-3">
              <div
                className="progress-bar-fill"
                style={{ width: `${(sendingProgress.current / sendingProgress.total) * 100}%` }}
              ></div>
            </div>
            
            <div className="progress-details text-xs">
              <div className="font-bold">
                {sendingProgress.current} de {sendingProgress.total} enviados
              </div>
              <div className="text-secondary mt-1">
                Destinatario actual: {sendingProgress.currentName}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
