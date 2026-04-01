import { Link } from 'react-router-dom';
import { FaBatteryFull, FaBolt, FaChartLine, FaLeaf, FaRobot, FaShieldAlt } from 'react-icons/fa';
import LandingCarImg from '../assets/landing-ev-car.png';
import './LandingPage.css';

const LandingPage = () => {
  return (
    <div className="landing-container">
      <div className="bg-glow glow-1"></div>
      <div className="bg-glow glow-2"></div>
      <div className="bg-glow glow-3"></div>

      <nav className="landing-nav">
        <div className="nav-brand">
          <FaBolt className="brand-icon" />
          <span>AI-BMS</span>
        </div>
        <div className="nav-links">
          <a href="#features" className="nav-link">Features</a>
          <a href="#how-it-works" className="nav-link">How it Works</a>
          <a href="#integrations" className="nav-link">Integrations</a>
        </div>
      </nav>

      <section className="hero-section">
        <div className="landing-hero-content">
          <h1 className="hero-title">
            AI-Based Battery Optimization and Performance Management System
          </h1>
          <p className="hero-subtitle">
            Intelligent battery health monitoring, charging optimization, and AI-powered insights for peak electric vehicle performance and longevity.
          </p>
          <Link to="/register" className="btn-get-started">
            Get Started <span style={{ marginLeft: '8px' }}>→</span>
          </Link>
        </div>
        <div className="hero-image-container">
          <img
            src={LandingCarImg}
            alt="Future EV Car"
            className="hero-car-img"
            style={{ borderRadius: '24px', boxShadow: '0 20px 40px rgba(0,0,0,0.1)' }}
          />
        </div>
      </section>

      <section id="features" className="features-section">
        <div className="features-grid">
          <div className="feature-card">
            <div className="feature-icon-wrapper">
              <FaBatteryFull size={24} />
            </div>
            <h3 className="feature-title">Battery Health Monitoring</h3>
            <p className="feature-desc">
              Real-time analysis of battery parameters, predicting degradation and preventing issues before they occur.
            </p>
          </div>

          <div className="feature-card">
            <div className="feature-icon-wrapper">
              <FaBolt size={24} />
            </div>
            <h3 className="feature-title">Intelligent Charging</h3>
            <p className="feature-desc">
              AI-powered scheduling for cost-effective, fast, and battery-preserving charging based on grid and usage patterns.
            </p>
          </div>

          <div className="feature-card">
            <div className="feature-icon-wrapper">
              <FaRobot size={24} />
            </div>
            <h3 className="feature-title">AI Coaching & Insights</h3>
            <p className="feature-desc">
              Personalized driving recommendations and energy-saving tips to maximize range and efficiency.
            </p>
          </div>
        </div>
      </section>

      <section id="how-it-works" className="how-it-works-section">
        <h2 className="section-title">How It Works</h2>
        <div className="process-diagram">
          <div className="process-content">
            <div className="process-step">
              <span className="step-icon">📡</span>
              <h4 className="step-title">Data Collection</h4>
              <p className="step-desc">Manual real-time EV data Ingestion</p>
            </div>
            <div className="process-arrow">→</div>
            <div className="process-step">
              <span className="step-icon">🧠</span>
              <h4 className="step-title">AI Analysis</h4>
              <p className="step-desc">Cloud AI processes health metrics</p>
            </div>
            <div className="process-arrow">→</div>
            <div className="process-step">
              <span className="step-icon">⚡</span>
              <h4 className="step-title">Optimization</h4>
              <p className="step-desc">Smart charging & suggestions</p>
            </div>
          </div>
        </div>
      </section>

      <section id="integrations" className="integrations-section">
        <h3 style={{ marginBottom: '3rem', color: '#666' }}>Platform Integrations</h3>
        <div className="brands-grid">
          <div className="brand-item"><FaShieldAlt /> TESLA</div>
          <div className="brand-item"><FaLeaf /> NISSAN</div>
          <div className="brand-item"><FaBolt /> BMW</div>
          <div className="brand-item"><FaChartLine /> PORSCHE</div>
        </div>
      </section>

      <footer className="landing-footer">
        <div className="footer-brand">
          <div className="nav-brand" style={{ color: 'white', marginBottom: '1rem' }}>
            <FaBolt />
            <span>AI-BMS</span>
          </div>
          <p className="footer-desc">
            We are an intelligent EV battery companion platform dedicated to extending the life and performance of Electric Vehicles through advanced machine learning technology.
          </p>
        </div>

        <div className="footer-links">
          <div className="link-group">
            <h4>Features</h4>
            <a href="#">Monitoring</a>
            <a href="#">Optimization</a>
            <a href="#">Analytics</a>
          </div>
          <div className="link-group">
            <h4>Company</h4>
            <a href="#">About Us</a>
            <a href="#">Careers</a>
            <a href="#">Contact</a>
          </div>
          <div className="link-group">
            <h4>Legal</h4>
            <a href="#">Privacy</a>
            <a href="#">Terms</a>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
