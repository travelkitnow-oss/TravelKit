import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import emailjs from '@emailjs/browser';
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
  Clock,
  CheckCircle,
  Loader2,
  Trash2,
  AlertCircle,
  Image as ImageIcon
} from 'lucide-react';
import ReactQuill, { Quill } from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';
import ResizeImage from 'quill-resize-image';
import './Campanas.css';

Quill.register('modules/resizeImage', ResizeImage);

const EMAILJS_SERVICE_ID = 'service_yy59l1c';
const EMAILJS_CAMPAIGN_TEMPLATE = 'template_dgvw2pq';
const EMAILJS_PUBLIC_KEY = 'C9hOpK5F-cE45ip5t';

const stripHtml = (html: string) =>
  html.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim();

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
  const [scheduleFreq, setScheduleFreq] = useState<'weekly' | 'monthly'>('weekly');
  const [scheduleDays, setScheduleDays] = useState<number[]>([1]); // 0=Dom..6=Sáb
  const [scheduleTime, setScheduleTime] = useState('09:00');
  const [scheduleMonthDay, setScheduleMonthDay] = useState(1);
  const [sendingProgress, setSendingProgress] = useState<{ active: boolean; current: number; total: number; currentName: string } | null>(null);

  // Templates & Schedules
  const [templates, setTemplates] = useState<any[]>([]);
  const [schedules, setSchedules] = useState<any[]>([]);
  const [showSaveTemplateModal, setShowSaveTemplateModal] = useState(false);
  const [templateName, setTemplateName] = useState('');
  const [isSavingTemplate, setIsSavingTemplate] = useState(false);
  const [isSavingSchedule, setIsSavingSchedule] = useState(false);

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

  const quillRef = useRef<ReactQuill>(null);

  const handleImageInsert = useCallback(() => {
    const input = document.createElement('input');
    input.setAttribute('type', 'file');
    input.setAttribute('accept', 'image/*');
    input.click();
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) return;
      if (file.size > 5 * 1024 * 1024) {
        showNotice('error', 'La imagen es muy pesada. Máximo 5MB.');
        return;
      }
      const reader = new FileReader();
      reader.onload = (e) => {
        const base64 = e.target?.result as string;
        const quill = quillRef.current?.getEditor();
        if (quill) {
          const range = quill.getSelection(true);
          quill.insertEmbed(range.index, 'image', base64);
          quill.setSelection(range.index + 1, 0);
        }
      };
      reader.readAsDataURL(file);
    };
  }, []);

  const quillModules = useMemo(() => ({
    toolbar: {
      container: [
        [{ 'header': [1, 2, 3, false] }],
        [{ 'size': ['small', false, 'large', 'huge'] }],
        ['bold', 'italic', 'underline', 'strike'],
        [{ 'color': extendedColors }, { 'background': extendedColors }],
        [{ 'list': 'ordered'}, { 'list': 'bullet' }],
        [{ 'align': [] }],
        ['image'],
        ['clean']
      ],
      handlers: {
        image: handleImageInsert
      }
    },
    resizeImage: {}
  }), [handleImageInsert]);

  useEffect(() => {
    fetchClients();
    fetchTemplates();
    fetchSchedules();
  }, []);

  useEffect(() => {
    if (settings) {
      setEmailTitle(settings.default_email_title || '');
      setEmailBody(settings.default_email_body || '');
      setScheduleType((settings.email_schedule_type as 'manual' | 'scheduled') || 'manual');
      // scheduleCron legacy removed

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

  const fetchTemplates = async () => {
    const { data } = await supabase.from('email_templates').select('*').order('created_at', { ascending: false });
    if (data) setTemplates(data);
  };

  const fetchSchedules = async () => {
    const { data } = await supabase.from('email_schedules').select('*').order('created_at', { ascending: false });
    if (data) setSchedules(data);
  };

  const handleSaveTemplate = async () => {
    if (!templateName.trim()) { showNotice('error', 'Escribí un nombre para la plantilla.'); return; }
    if (!emailTitle.trim() || !emailBody.trim()) { showNotice('error', 'El asunto y cuerpo no pueden estar vacíos.'); return; }
    setIsSavingTemplate(true);
    const { error } = await supabase.from('email_templates').insert([{ name: templateName.trim(), subject: emailTitle, body: emailBody }]);
    setIsSavingTemplate(false);
    if (error) { showNotice('error', 'Error al guardar plantilla.'); return; }
    showNotice('success', `Plantilla "${templateName}" guardada.`);
    setTemplateName('');
    setShowSaveTemplateModal(false);
    fetchTemplates();
  };

  const handleLoadTemplate = (t: any) => {
    setEmailTitle(t.subject);
    setEmailBody(t.body);
    showNotice('success', `Plantilla "${t.name}" cargada en el editor.`);
  };

  const handleDeleteTemplate = async (id: string) => {
    await supabase.from('email_templates').delete().eq('id', id);
    fetchTemplates();
  };

  const buildCronLabel = () => {
    const dayNames = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'];
    if (scheduleFreq === 'weekly') {
      const days = scheduleDays.map(d => dayNames[d]).join(', ');
      return `Semanal · ${days} · ${scheduleTime} hs`;
    }
    return `Mensual · Día ${scheduleMonthDay} · ${scheduleTime} hs`;
  };

  const handleSaveSchedule = async () => {
    if (!emailTitle.trim() || !emailBody.trim()) { showNotice('error', 'El asunto y cuerpo no pueden estar vacíos.'); return; }
    if (scheduleFreq === 'weekly' && scheduleDays.length === 0) { showNotice('error', 'Seleccioná al menos un día.'); return; }
    const name = emailTitle.slice(0, 50) || 'Envío programado';
    const cron_type = buildCronLabel();
    setIsSavingSchedule(true);
    const { error } = await supabase.from('email_schedules').insert([{ name, subject: emailTitle, body: emailBody, cron_type, active: true }]);
    setIsSavingSchedule(false);
    if (error) { showNotice('error', 'Error al guardar envío programado.'); return; }
    showNotice('success', 'Envío programado guardado y activado.');
    fetchSchedules();
  };

  const handleToggleSchedule = async (id: string, current: boolean) => {
    await supabase.from('email_schedules').update({ active: !current }).eq('id', id);
    fetchSchedules();
  };

  const handleDeleteSchedule = async (id: string) => {
    await supabase.from('email_schedules').delete().eq('id', id);
    fetchSchedules();
  };

  const cronLabel = (cron: string) => ({
    every_monday_12am: 'Lunes 00:00 hs',
    every_friday_6pm: 'Viernes 18:00 hs',
    every_first_month_9am: 'Día 1 del mes 09:00 hs',
  }[cron] || cron);

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
    setSendingProgress({ active: true, current: 0, total: selectedList.length, currentName: selectedList[0].name });

    let sent = 0;
    let failed = 0;

    for (let i = 0; i < selectedList.length; i++) {
      const client = selectedList[i];
      setSendingProgress(prev => prev ? { ...prev, current: i, currentName: client.name } : null);
      try {
        await emailjs.send(
          EMAILJS_SERVICE_ID,
          EMAILJS_CAMPAIGN_TEMPLATE,
          {
            to_name: client.name,
            to_email: client.email,
            html_body: stripHtml(emailTitle),
            message: stripHtml(emailBody),
          },
          EMAILJS_PUBLIC_KEY
        );
        sent++;
      } catch (err) {
        console.error(`Error enviando a ${client.email}:`, err);
        failed++;
      }
    }

    setSendingProgress(prev => prev ? { ...prev, current: selectedList.length, currentName: 'Finalizado' } : null);

    logger.success('Publicidad', `Campaña "${emailTitle}" enviada`, {
      sent,
      failed,
      recipients: selectedList.map(c => c.email)
    });

    setTimeout(() => {
      setSendingProgress(null);
      if (failed === 0) {
        showNotice('success', `¡Campaña enviada con éxito a ${sent} cliente${sent !== 1 ? 's' : ''}!`);
      } else {
        showNotice('error', `Enviado a ${sent}, fallaron ${failed}. Verificá el template de EmailJS.`);
      }
    }, 800);
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
          <div className="mail-3col-grid">

            {/* COL 1: Destinatarios */}
            <div className="col-recipients">
              <div className="col-label"><Users size={15} /> Destinatarios</div>
              <div className="glass-card campaign-card" style={{ flex: 1 }}>
                <div className="col1-inner">
                  <div className="selected-badge">
                    {selectedClients.size > 0
                      ? <><CheckCircle size={14} /> {selectedClients.size} seleccionado{selectedClients.size !== 1 ? 's' : ''}</>
                      : 'Ninguno seleccionado'}
                  </div>
                  <div className="search-input-wrapper">
                    <Search size={14} />
                    <input
                      type="text"
                      placeholder="Buscar..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                  <label className="checkbox-container select-all-label">
                    <input type="checkbox" checked={isAllSelected} onChange={handleToggleSelectAll} />
                    <span className="checkmark"></span>
                    <span className="checkbox-label">{isAllSelected ? 'Quitar todos' : 'Todos'} ({filteredClients.length})</span>
                  </label>
                  <div className="clients-list-container">
                    {loadingClients ? (
                      <div className="loading-sublist"><Loader2 className="spinner" size={20} /></div>
                    ) : filteredClients.length === 0 ? (
                      <p className="text-secondary text-sm text-center py-4">Sin resultados.</p>
                    ) : filteredClients.map(c => (
                      <div key={c.id} className={`client-row-item ${selectedClients.has(c.id) ? 'selected' : ''}`} onClick={() => handleToggleClient(c.id)}>
                        <label className="checkbox-container" onClick={e => e.stopPropagation()}>
                          <input type="checkbox" checked={selectedClients.has(c.id)} onChange={() => handleToggleClient(c.id)} />
                          <span className="checkmark"></span>
                        </label>
                        <div className="client-item-info">
                          <span className="client-item-name font-bold">{c.name}</span>
                          <span className="client-item-email text-xs text-secondary">{c.email}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* COL 2: Redactar */}
            <div className="col-compose">
              <div className="col-label"><Mail size={15} /> Redactar Campaña</div>
              <div className="glass-card campaign-card">
                <div className="card-body" style={{ padding: '1.5rem' }}>
                  <input
                    type="text"
                    className="form-input compose-subject-input mb-3"
                    placeholder="Asunto del correo..."
                    value={emailTitle}
                    onChange={(e) => setEmailTitle(e.target.value)}
                  />
                  <div className="rich-editor-wrapper">
                    <ReactQuill
                      ref={quillRef}
                      theme="snow"
                      value={emailBody}
                      onChange={setEmailBody}
                      modules={quillModules}
                      placeholder="Escribí tu mensaje. Usá el ícono de imagen en el toolbar para insertar fotos inline..."
                    />
                  </div>
                </div>
              </div>

              {/* Scheduling */}
              <div className="schedule-section-flat">
                <div className="schedule-options-row">
                  <button type="button" className={`schedule-pill ${scheduleType === 'manual' ? 'active' : ''}`} onClick={() => setScheduleType('manual')}>
                    <span className="schedule-pill-icon"><Send size={14} /></span> Envío Manual
                  </button>
                  <button type="button" className={`schedule-pill ${scheduleType === 'scheduled' ? 'active' : ''}`} onClick={() => setScheduleType('scheduled')}>
                    <span className="schedule-pill-icon"><Clock size={14} /></span> Envío Programado
                  </button>
                </div>
                {scheduleType === 'scheduled' && (
                  <div className="schedule-builder animate-fade-in">
                    <div className="schedule-freq-row">
                      <button type="button" className={`freq-pill ${scheduleFreq === 'weekly' ? 'active' : ''}`} onClick={() => setScheduleFreq('weekly')}>Semanal</button>
                      <button type="button" className={`freq-pill ${scheduleFreq === 'monthly' ? 'active' : ''}`} onClick={() => setScheduleFreq('monthly')}>Mensual</button>
                    </div>
                    {scheduleFreq === 'weekly' && (
                      <div className="days-picker">
                        {['D','L','M','X','J','V','S'].map((d, i) => (
                          <button key={i} type="button"
                            className={`day-btn ${scheduleDays.includes(i) ? 'active' : ''}`}
                            onClick={() => setScheduleDays(prev => prev.includes(i) ? prev.filter(x => x !== i) : [...prev, i])}
                          >{d}</button>
                        ))}
                      </div>
                    )}
                    {scheduleFreq === 'monthly' && (
                      <div className="month-day-row">
                        <span className="schedule-label-sm">Día del mes:</span>
                        <input type="number" min={1} max={28} className="form-input month-day-input"
                          value={scheduleMonthDay} onChange={e => setScheduleMonthDay(Number(e.target.value))} />
                      </div>
                    )}
                    <div className="time-row">
                      <span className="schedule-label-sm">Horario:</span>
                      <input type="time" className="form-input time-input"
                        value={scheduleTime} onChange={e => setScheduleTime(e.target.value)} />
                      <span className="schedule-hint">{buildCronLabel()}</span>
                    </div>
                  </div>
                )}
              </div>

              <div className="compose-actions">
                <button className="btn btn-outline" onClick={() => { setTemplateName(''); setShowSaveTemplateModal(true); }}>
                  <Save size={16} /> Guardar Plantilla
                </button>
                {scheduleType === 'scheduled' && (
                  <button className="btn btn-outline" onClick={handleSaveSchedule} disabled={isSavingSchedule}>
                    <Calendar size={16} /> {isSavingSchedule ? 'Guardando...' : 'Programar'}
                  </button>
                )}
                <button className="btn btn-primary compose-send-btn" onClick={handleSendEmailsManual} disabled={sendingProgress !== null || selectedClients.size === 0}>
                  <Send size={16} /> Enviar Ahora
                </button>
              </div>
            </div>

            {/* COL 3: Plantillas & Programados */}
            <div className="col-library">
              {/* Templates */}
              <div className="col-label"><Save size={15} /> Plantillas <span className="badge-count">{templates.length}</span></div>
              <div className="glass-card campaign-card library-card">
                {templates.length === 0 ? (
                  <div className="library-empty">
                    <Save size={24} style={{ opacity: 0.2 }} />
                    <p>Guardá plantillas para reutilizarlas</p>
                  </div>
                ) : (
                  <div className="library-list">
                    {templates.map(t => (
                      <div key={t.id} className="list-item-row">
                        <div className="list-item-info">
                          <span className="list-item-name">{t.name}</span>
                          <span className="list-item-sub">{t.subject}</span>
                        </div>
                        <div style={{ display: 'flex', gap: '0.4rem' }}>
                          <button className="btn-icon btn-icon-accent" onClick={() => handleLoadTemplate(t)} title="Cargar en editor"><Mail size={14} /></button>
                          <button className="btn-icon btn-icon-danger" onClick={() => handleDeleteTemplate(t.id)} title="Eliminar"><Trash2 size={14} /></button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Schedules */}
              <div className="col-label" style={{ marginTop: '1.5rem' }}><Clock size={15} /> Programados <span className="badge-count">{schedules.length}</span></div>
              <div className="glass-card campaign-card library-card">
                {schedules.length === 0 ? (
                  <div className="library-empty">
                    <Clock size={24} style={{ opacity: 0.2 }} />
                    <p>No hay envíos programados</p>
                  </div>
                ) : (
                  <div className="library-list">
                    {schedules.map(s => (
                      <div key={s.id} className="list-item-row">
                        <div className="list-item-info">
                          <span className="list-item-name">{s.name}</span>
                          <span className="list-item-sub">{cronLabel(s.cron_type)}</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                          <label className="switch" style={{ transform: 'scale(0.8)' }} title={s.active ? 'Activo' : 'Inactivo'}>
                            <input type="checkbox" checked={s.active} onChange={() => handleToggleSchedule(s.id, s.active)} />
                            <span className="slider round"></span>
                          </label>
                          <button className="btn-icon btn-icon-danger" onClick={() => handleDeleteSchedule(s.id)} title="Eliminar"><Trash2 size={14} /></button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
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

      {/* Save template modal */}
      {showSaveTemplateModal && (
        <div className="modal-overlay" style={{ zIndex: 1500 }} onClick={() => setShowSaveTemplateModal(false)}>
          <div className="glass-card animate-scale-in" style={{ maxWidth: '420px', width: '90%', padding: '2rem', borderRadius: '20px', background: 'white' }} onClick={e => e.stopPropagation()}>
            <h3 style={{ fontWeight: 700, color: 'var(--color-primary)', marginBottom: '0.5rem' }}>Guardar Plantilla</h3>
            <p className="text-secondary text-sm mb-4">Dale un nombre para identificarla fácilmente.</p>
            <input
              type="text"
              className="form-input mb-4"
              placeholder="Ej: Promo Europa Julio, Newsletter Mensual..."
              value={templateName}
              onChange={e => setTemplateName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSaveTemplate()}
              autoFocus
            />
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
              <button className="btn btn-outline" onClick={() => setShowSaveTemplateModal(false)}>Cancelar</button>
              <button className="btn btn-primary" onClick={handleSaveTemplate} disabled={isSavingTemplate}>
                <Save size={16} />
                {isSavingTemplate ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}

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
