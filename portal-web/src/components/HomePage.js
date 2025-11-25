import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  WifiOff, 
  Award, 
  BarChart3, 
  CheckCircle2, 
  ArrowRight, 
  ShieldCheck,
  Smartphone
} from 'lucide-react';
import { buttonHoverTap } from '../App'; // Importa animação padrão de botão
import logoLight from '../nexstage_sem_fundo_escuro.svg'; // Ajuste se necessário para o logo correto
import logoDark from '../nexstage_sem_fundo_branco.svg';

// Variantes de Animação
const fadeInUp = {
  hidden: { opacity: 0, y: 40 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" } }
};

const staggerContainer = {
  hidden: { opacity: 1 },
  visible: { opacity: 1, transition: { staggerChildren: 0.15 } }
};

function HomePage({ theme }) {
  const navigate = useNavigate();
  return (
    <div className="home-page">
      
      {/* === HERO SECTION === */}
      <section className="hero-section">
        <div className="hero-content">
          <motion.div 
            initial="hidden"
            animate="visible"
            variants={fadeInUp}
            className="hero-text-wrapper"
          >
            <div className="brand-pill">
              <span className="pill-dot"></span>
              Lançamento NexStage 2.0
            </div>
            
            <h1 className="hero-title">
              Gestão de Eventos <br />
              <span className="text-gradient">Sem Limites de Conexão</span>
            </h1>
            
            <p className="hero-subtitle">
              A solução completa para check-in de alta performance, emissão de certificados 
              e monitoramento em tempo real. Projetado para funcionar onde a internet não chega.
            </p>

            <div className="hero-actions">
              <motion.button 
                className="btn-hero-primary"
                onClick={() => navigate('/register')}
                {...buttonHoverTap}
              >
                Começar agora <ArrowRight size={18} />
              </motion.button>
              
              <motion.button 
                className="btn-hero-secondary"
                onClick={() => navigate('/login')}
                {...buttonHoverTap}
              >
                Acessar plataforma
              </motion.button>
            </div>

            <div className="hero-stats">
              <div className="stat-item">
                <strong>100%</strong> <span>Offline-Ready</span>
              </div>
              <div className="separator"></div>
              <div className="stat-item">
                <strong>0s</strong> <span>Latência Local</span>
              </div>
              <div className="separator"></div>
              <div className="stat-item">
                <strong>Automação</strong> <span>De Certificados</span>
              </div>
            </div>
          </motion.div>

          {/* Ilustração / Logo Hero (Opcional: Pode ser um mockup do app) */}
          <motion.div 
            className="hero-image-container"
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
          >
            <div className="glow-bg"></div>
            <img 
              src={theme === 'light' ? logoLight : logoDark} 
              alt="NexStage" 
              className="hero-logo-display" 
            />
           </motion.div>
        </div>
      </section>

      {/* === FEATURES GRID === */}
      <section className="features-section">
        <div className="section-header">
          <h2>Por que grandes eventos escolhem a NexStage?</h2>
          <p>Tecnologia desenvolvida para eliminar filas e garantir a segurança dos dados.</p>
        </div>

        <motion.div 
          className="features-grid"
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
        >
          <FeatureCard 
            icon={WifiOff}
            title="Check-in offline blindado"
            desc="Nunca pare sua operação. Nosso App Local sincroniza automaticamente quando a rede retorna, sem perda de dados."
          />
          <FeatureCard 
            icon={Award}
            title="Certificados inteligentes"
            desc="Geração e envio automático de certificados validados com QR Code único antifraude."
          />
          <FeatureCard 
            icon={BarChart3}
            title="Monitoramento em tempo real"
            desc="Dashboard ao vivo para acompanhar o fluxo de entrada e performance da equipe de atendimento."
          />
          <FeatureCard 
            icon={Smartphone}
            title="Plataforma Attendance robusta"
            desc="Interface otimizada para tablets e desktops, pensada para velocidade máxima no credenciamento."
          />
          <FeatureCard 
            icon={ShieldCheck}
            title="Segurança de dados"
            desc="Arquitetura de microsserviços com autenticação JWT Stateless e logs auditáveis."
          />
          <FeatureCard 
            icon={CheckCircle2}
            title="Validação instantânea"
            desc="Leitura de QR Codes ultra-rápida para validação de inscrições e controle de acesso."
          />
        </motion.div>
      </section>

      {/* === CTA FINAL === */}
      <section className="cta-section">
        <div className="cta-card">
          <h2>Pronto para elevar o nível do seu evento?</h2>
          <p>Junte-se aos organizadores que não dependem da sorte (ou do Wi-Fi).</p>
          <button className="btn-cta-final" onClick={() => navigate('/register')}>
            Criar conta!
          </button>
        </div>
      </section>

      {/* === FOOTER SIMPLES === */}
      <footer className="home-footer">
        <p>© 2025 NexStage Sistemas. Todos os direitos reservados.</p>
        <div className="footer-links">
          <a href="#">Termos</a>
          <a href="#">Privacidade</a>
          <a href="#">Suporte</a>
        </div>
      </footer>
    </div>
  );
}

// Sub-componente simples para o Card
function FeatureCard({ icon: Icon, title, desc }) {
  return (
    <motion.div className="feature-card" variants={fadeInUp}>
      <div className="icon-box">
        <Icon size={24} />
      </div>
      <h3>{title}</h3>
      <p>{desc}</p>
    </motion.div>
  );
}

export default HomePage;
