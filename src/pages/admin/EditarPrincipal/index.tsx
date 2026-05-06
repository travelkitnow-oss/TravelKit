import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../../lib/supabase';
import { Save, X, Info, Plus, Trash2, ChevronLeft, ChevronRight } from 'lucide-react';
import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';
import './EditarPrincipal.css';

interface Setting {
  key: string;
  value: string;
}

const DEFAULT_CONTENT = {
  hero_title: 'Organiza el viaje de tu vida con Travel Kit',
  hero_description: 'Descubre una nueva forma de viajar. Te ayudamos a planificar cada detalle con sesiones personalizadas uno a uno para que tu única preocupación sea disfrutar el destino.',
  services_title: 'Por qué elegir Travel Kit',
  services_subtitle: 'Nos encargamos de todo para que tu única tarea sea armar las valijas y disfrutar.',
  benefits_list: JSON.stringify([
    { id: '1', title: 'Itinerarios a medida', description: 'Diseñamos rutas personalizadas basadas en tus gustos, presupuesto y ritmo de viaje preferido.', icon: 'Plane' },
    { id: '2', title: 'Gestión de reservas', description: 'Nos ocupamos de vuelos, alojamientos y excursiones, encontrando siempre las mejores opciones del mercado.', icon: 'CalendarCheck' },
    { id: '3', title: 'Asistencia en viaje', description: 'Viaja con tranquilidad. Estaremos disponibles para resolver cualquier imprevisto durante tu aventura.', icon: 'Shield' }
  ]),
  destinations_title: 'Inspiración para tu próximo viaje',
  destinations_subtitle: 'Descubre algunos de los destinos que hemos preparado para nuestros viajeros.'
};

export default function EditarPrincipal() {
  const [content, setContent] = useState<Record<string, string>>(DEFAULT_CONTENT);
  const [benefits, setBenefits] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [currentBenefitIndex, setCurrentBenefitIndex] = useState(0);

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

  useEffect(() => {
    fetchContent();
  }, []);

  // Inject custom HEX button into the Quill color picker dropdowns
  useEffect(() => {
    const timer = setTimeout(() => {
      // 1. Initialize global selection trackers on all Quill instances
      const allQuills = document.querySelectorAll('.ql-container');
      allQuills.forEach(qlContainer => {
        try {
          // @ts-ignore
          const quill = ReactQuill.Quill.find(qlContainer);
          if (quill && !quill.__customSelectionTracker) {
            quill.__customSelectionTracker = true;
            quill.__lastValidRange = null;
            quill.on('selection-change', (range: any) => {
              if (range && range.length > 0) {
                quill.__lastValidRange = range;
              }
            });
          }
        } catch (e) {
          console.error(e);
        }
      });

      // 2. Inject the custom HEX UI
      const pickers = document.querySelectorAll('.ql-color .ql-picker-options, .ql-background .ql-picker-options');
      
      pickers.forEach(picker => {
        if (!picker.querySelector('.custom-hex-container')) {
          const container = document.createElement('div');
          container.className = 'custom-hex-container';
          container.style.clear = 'both';
          container.style.width = '100%';
          container.style.padding = '8px 6px';
          container.style.marginTop = '4px';
          container.style.borderTop = '1px solid #e2e8f0';
          container.style.backgroundColor = '#f8fafc';
          container.style.display = 'flex';
          container.style.gap = '4px';
          container.style.alignItems = 'center';
          container.style.borderRadius = '0 0 4px 4px';

          container.onclick = (e) => e.stopPropagation();

          let activeQuill: any = null;

          container.onmouseenter = () => {
            try {
              const qlContainer = picker.closest('.quill')?.querySelector('.ql-container');
              if (qlContainer) {
                // @ts-ignore
                activeQuill = ReactQuill.Quill.find(qlContainer);
              }
            } catch (err) {}
          };

          const input = document.createElement('input');
          input.type = 'text';
          input.placeholder = 'Ej: #C89B5A';
          input.style.width = '100%';
          input.style.padding = '4px 8px';
          input.style.border = '1px solid #cbd5e1';
          input.style.borderRadius = '4px';
          input.style.fontSize = '12px';
          input.style.outline = 'none';
          input.style.fontFamily = 'monospace';

          input.onmousedown = (e) => e.stopPropagation(); // Permitir foco
          input.onfocus = () => {
            input.style.borderColor = 'var(--color-accent)';
          };
          input.onblur = () => input.style.borderColor = '#cbd5e1';

          const applyBtn = document.createElement('button');
          applyBtn.innerHTML = '✓';
          applyBtn.style.padding = '4px 8px';
          applyBtn.style.backgroundColor = 'var(--color-primary)';
          applyBtn.style.color = 'white';
          applyBtn.style.border = 'none';
          applyBtn.style.borderRadius = '4px';
          applyBtn.style.cursor = 'pointer';
          applyBtn.style.fontSize = '12px';
          applyBtn.style.fontWeight = 'bold';
          applyBtn.title = 'Aplicar Color';

          const applyColor = () => {
            const hex = input.value.trim();
            if (hex) {
              const cleanHex = hex.startsWith('#') ? hex : (hex.length === 6 && !isNaN(Number('0x'+hex)) ? `#${hex}` : hex);
              
              if (activeQuill && activeQuill.__lastValidRange) {
                 const isBackground = picker.closest('.ql-background') !== null;
                 const formatType = isBackground ? 'background' : 'color';
                 
                 activeQuill.formatText(activeQuill.__lastValidRange.index, activeQuill.__lastValidRange.length, formatType, cleanHex);
                 
                 const pickerNode = picker.closest('.ql-picker');
                 if (pickerNode) pickerNode.classList.remove('ql-expanded');
              } else {
                 let dynamicSwatch = picker.querySelector('.dynamic-swatch') as HTMLElement;
                 if (!dynamicSwatch) {
                   dynamicSwatch = document.createElement('span');
                   dynamicSwatch.className = 'ql-picker-item dynamic-swatch';
                   dynamicSwatch.style.display = 'none';
                   picker.appendChild(dynamicSwatch);
                 }
                 dynamicSwatch.setAttribute('data-value', cleanHex);
                 dynamicSwatch.click();
              }
              input.value = '';
            }
          };

          applyBtn.onclick = (e) => {
            e.preventDefault();
            e.stopPropagation();
            applyColor();
          };

          input.onkeydown = (e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              e.stopPropagation();
              applyColor();
            }
          };

          container.appendChild(input);
          container.appendChild(applyBtn);
          picker.appendChild(container);
        }
      });
    }, 1000); // Wait for ReactQuill to mount

    return () => clearTimeout(timer);
  }, [benefits, content]); // Re-run if dynamic content forces re-render of editors

  async function fetchContent() {
    try {
      setLoading(true);
      const { data, error } = await supabase.from('site_settings').select('*');
      
      if (error) throw error;

      if (data && data.length > 0) {
        const newContent = { ...DEFAULT_CONTENT };
        data.forEach((item: Setting) => {
          if (item.key in newContent) {
            newContent[item.key as keyof typeof DEFAULT_CONTENT] = item.value;
          }
        });
        setContent(newContent);
        try {
          setBenefits(JSON.parse(newContent.benefits_list || '[]'));
        } catch (e) {
          setBenefits([]);
        }
      } else {
        try {
          setBenefits(JSON.parse(DEFAULT_CONTENT.benefits_list));
        } catch (e) {}
      }
    } catch (error) {
      console.error('Error fetching content:', error);
      // If table doesn't exist, we just keep defaults for now
    } finally {
      setLoading(false);
    }
  }

  const handleChange = (key: string, value: string) => {
    setContent(prev => ({ ...prev, [key]: value }));
  };

  const handleCancel = () => {
    fetchContent();
    setMessage(null);
  };

  const handlePublish = async () => {
    try {
      setSaving(true);
      setMessage(null);

      const upsertData = Object.entries(content).map(([key, value]) => ({
        key,
        value
      }));
      
      const benefitsIndex = upsertData.findIndex(d => d.key === 'benefits_list');
      if (benefitsIndex >= 0) {
        upsertData[benefitsIndex].value = JSON.stringify(benefits);
      } else {
        upsertData.push({ key: 'benefits_list', value: JSON.stringify(benefits) });
      }

      const { error } = await supabase.from('site_settings').upsert(upsertData);

      if (error) throw error;

      setMessage({ type: 'success', text: '¡Cambios publicados con éxito!' });
    } catch (error) {
      console.error('Error saving content:', error);
      setMessage({ type: 'error', text: 'Error al publicar los cambios. Asegúrate de que la tabla "site_settings" existe en la base de datos.' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="loading-container">Cargando contenido...</div>;
  }

  return (
    <div className="editar-principal animate-fade-in">
      <header className="page-header">
        <div>
          <h1>Editar Principal</h1>
          <p>Personaliza los textos que ven tus clientes en la página de inicio.</p>
        </div>
        <div className="header-actions">
          <button className="btn btn-outline" onClick={handleCancel} disabled={saving}>
            <X size={18} /> Cancelar
          </button>
          <button className="btn btn-primary" onClick={handlePublish} disabled={saving}>
            <Save size={18} /> {saving ? 'Publicando...' : 'Publicar Cambios'}
          </button>
        </div>
      </header>

      {message && (
        <div className={`alert alert-${message.type}`}>
          <Info size={20} />
          <span>{message.text}</span>
        </div>
      )}

      <div className="edit-sections-grid">
        {/* HERO SECTION */}
        <section className="glass-card edit-card">
          <div className="card-header">
            <h3>Sección Principal (Hero)</h3>
            <span className="badge-info">Primer vistazo de la web</span>
          </div>
          <div className="card-body">
            <div className="input-group">
              <label htmlFor="hero_title">Título Principal</label>
              <div style={{ backgroundColor: 'white' }}>
                <ReactQuill 
                  theme="snow"
                  value={content.hero_title}
                  onChange={(val) => handleChange('hero_title', val)}
                  modules={quillModules}
                />
              </div>
              <p className="input-help">Este es el texto grande que aparece al inicio.</p>
            </div>

            <div className="input-group">
              <label htmlFor="hero_description">Descripción</label>
              <div style={{ backgroundColor: 'white' }}>
                <ReactQuill 
                  theme="snow"
                  value={content.hero_description}
                  onChange={(val) => handleChange('hero_description', val)}
                  modules={quillModules}
                />
              </div>
              <p className="input-help">Texto que acompaña al título principal. Puedes usar formato.</p>
            </div>
          </div>
        </section>

        {/* SERVICES HEADER */}
        <section className="glass-card edit-card">
          <div className="card-header">
            <h3>Sección "Por qué elegirnos"</h3>
            <span className="badge-info">Encabezado de beneficios</span>
          </div>
          <div className="card-body">
            <div className="input-group">
              <label htmlFor="services_title">Título de la Sección</label>
              <div style={{ backgroundColor: 'white' }}>
                <ReactQuill 
                  theme="snow"
                  value={content.services_title || ''}
                  onChange={(val) => handleChange('services_title', val)}
                  modules={quillModules}
                />
              </div>
            </div>

            <div className="input-group">
              <label htmlFor="services_subtitle">Subtítulo / Introducción</label>
              <div style={{ backgroundColor: 'white' }}>
                <ReactQuill 
                  theme="snow"
                  value={content.services_subtitle}
                  onChange={(val) => handleChange('services_subtitle', val)}
                  modules={quillModules}
                />
              </div>
            </div>
          </div>
        </section>

        {/* DESTINATIONS HEADER */}
        <section className="glass-card edit-card">
          <div className="card-header">
            <h3>Sección "Destinos"</h3>
            <span className="badge-info">Recomendaciones</span>
          </div>
          <div className="card-body">
            <div className="input-group">
              <label htmlFor="destinations_title">Título de la Sección</label>
              <div style={{ backgroundColor: 'white' }}>
                <ReactQuill 
                  theme="snow"
                  value={content.destinations_title || ''}
                  onChange={(val) => handleChange('destinations_title', val)}
                  modules={quillModules}
                />
              </div>
            </div>

            <div className="input-group">
              <label htmlFor="destinations_subtitle">Subtítulo / Introducción</label>
              <div style={{ backgroundColor: 'white' }}>
                <ReactQuill 
                  theme="snow"
                  value={content.destinations_subtitle || ''}
                  onChange={(val) => handleChange('destinations_subtitle', val)}
                  modules={quillModules}
                />
              </div>
            </div>
          </div>
        </section>

        {/* SERVICE CARDS */}
        <section className="glass-card edit-card full-width">
          <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h3>Tarjetas de Beneficios</h3>
              <span className="badge-info">Pilares del servicio</span>
            </div>
            <button 
              className="btn btn-sm btn-primary" 
              onClick={() => {
                setBenefits(prev => {
                  const newB = [...prev, { id: Math.random().toString(), title: 'Nuevo Beneficio', description: '', icon: 'Star' }];
                  setCurrentBenefitIndex(newB.length - 1);
                  return newB;
                });
              }}
            >
              <Plus size={16} /> Agregar Beneficio
            </button>
          </div>
          <div className="card-body">
            {benefits.length === 0 ? (
              <div className="p-4 text-center text-secondary">No hay beneficios cargados.</div>
            ) : (
              <div className="benefit-carousel-container" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <button 
                  className="btn-icon" 
                  onClick={() => setCurrentBenefitIndex(prev => prev === 0 ? benefits.length - 1 : prev - 1)}
                  style={{ flexShrink: 0 }}
                >
                  <ChevronLeft size={24} />
                </button>

                <div className="edit-sub-section border-left" style={{ position: 'relative', flex: 1 }}>
                  <button 
                    className="btn-icon-sm" 
                    style={{ position: 'absolute', top: 0, right: 0, color: 'var(--color-danger)' }}
                    onClick={() => {
                      const newBenefits = benefits.filter((_, i) => i !== currentBenefitIndex);
                      setBenefits(newBenefits);
                      setCurrentBenefitIndex(Math.max(0, Math.min(currentBenefitIndex, newBenefits.length - 1)));
                    }}
                    title="Eliminar beneficio"
                  >
                    <Trash2 size={16} />
                  </button>
                  <div className="sub-header">
                    <div className="icon-placeholder">{currentBenefitIndex + 1}</div>
                    <h4>Beneficio {currentBenefitIndex + 1} de {benefits.length}</h4>
                  </div>
                  
                  <div className="input-group">
                    <label>Icono</label>
                    <select 
                      className="form-input"
                      value={benefits[currentBenefitIndex]?.icon || 'Star'}
                      onChange={e => {
                        const newB = [...benefits];
                        if (newB[currentBenefitIndex]) {
                          newB[currentBenefitIndex].icon = e.target.value;
                          setBenefits(newB);
                        }
                      }}
                    >
                      <option value="Plane">Avión</option>
                      <option value="CalendarCheck">Calendario</option>
                      <option value="Shield">Escudo / Seguridad</option>
                      <option value="Star">Estrella</option>
                      <option value="MapPin">Pin de Mapa</option>
                      <option value="Heart">Corazón</option>
                      <option value="Compass">Brújula</option>
                    </select>
                  </div>

                  <div className="input-group">
                    <label>Título</label>
                    <div style={{ backgroundColor: 'white' }}>
                      <ReactQuill 
                        theme="snow"
                        value={benefits[currentBenefitIndex]?.title || ''}
                        onChange={(val) => {
                          const newB = [...benefits];
                          if (newB[currentBenefitIndex]) {
                            newB[currentBenefitIndex].title = val;
                            setBenefits(newB);
                          }
                        }}
                        modules={quillModules}
                      />
                    </div>
                  </div>
                  <div className="input-group">
                    <label>Descripción</label>
                    <div style={{ backgroundColor: 'white' }}>
                      <ReactQuill 
                        theme="snow"
                        value={benefits[currentBenefitIndex]?.description || ''}
                        onChange={(val) => {
                          const newB = [...benefits];
                          if (newB[currentBenefitIndex]) {
                            newB[currentBenefitIndex].description = val;
                            setBenefits(newB);
                          }
                        }}
                        modules={quillModules}
                      />
                    </div>
                  </div>
                </div>

                <button 
                  className="btn-icon" 
                  onClick={() => setCurrentBenefitIndex(prev => prev === benefits.length - 1 ? 0 : prev + 1)}
                  style={{ flexShrink: 0 }}
                >
                  <ChevronRight size={24} />
                </button>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
