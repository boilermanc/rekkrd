import React from 'react';
import { Link } from 'react-router-dom';
import SEO from '../components/SEO';
import './About.css';

const About: React.FC = () => {
  return (
    <div className="about-page">
      <SEO
        title="About"
        description="Rekkrd was built by collectors, for collectors. Learn about our story, what we built, and the people behind it."
      />

      {/* NAV */}
      <nav className="about-nav">
        <Link to="/" className="about-nav-logo">
          <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" style={{ width: '1.4em', height: '1.4em', flexShrink: 0 }}>
            <circle cx="12" cy="12" r="11" fill="#2a2520"/>
            <circle cx="12" cy="12" r="9.5" fill="none" stroke="#3a3530" strokeWidth="0.4" opacity="0.5"/>
            <circle cx="12" cy="12" r="8" fill="none" stroke="#3a3530" strokeWidth="0.3" opacity="0.4"/>
            <circle cx="12" cy="12" r="6.5" fill="none" stroke="#3a3530" strokeWidth="0.3" opacity="0.3"/>
            <circle cx="12" cy="12" r="5.2" fill="#1a1916"/>
            <text x="12" y="12.5" textAnchor="middle" dominantBaseline="central" fontFamily="Georgia,serif" fontWeight="bold" fontSize="7" fill="#c45a30">R</text>
          </svg>
          Rekk<span style={{ color: '#c45a30' }}>r</span>d
        </Link>
        <ul className="about-nav-links">
          <li><Link to="/">Collection</Link></li>
          <li><Link to="/#stakkd">Stakkd</Link></li>
          <li><Link to="/#pricing">Pricing</Link></li>
          <li><Link to="/about">About</Link></li>
        </ul>
      </nav>

      {/* HERO */}
      <section className="about-hero">
        <div className="about-hero-left">
          <p className="about-hero-eyebrow">Our Story</p>
          <h1 className="about-hero-title">Built by <em>collectors,</em> for collectors.</h1>
          <p className="about-hero-intro">
            Rekkrd started with some shelves on a wall and a Dual turntable running on one speaker.
            It grew into something we think you'll love.
          </p>
        </div>
        <div className="about-hero-right">
          <div className="vinyl-wrap">
            <div className="vinyl-glow"></div>
            <div className="vinyl-disc">
              <div className="vinyl-grooves"></div>
            </div>
          </div>
        </div>
      </section>

      {/* STORY */}
      <section className="about-story">
        <p className="section-label">Origin</p>
        <div className="story-grid">
          <div className="story-pull">
            "Turns out I'd been sitting on a gem and didn't even know it."
            <span>&mdash; Clint Crowe, Founder</span>
          </div>
          <div className="story-body">
            <p>
              Nobody plans to become a record collector. It just happens. For us it started with
              display shelves &mdash; the kind that show your album covers on the wall. Once those went up,
              the collection started growing on its own.
            </p>
            <p>
              We had an old Dual turntable from the early 80s doing its best on one speaker. Honestly,
              it was enough. There's something about pulling a record out and putting it on that just
              gets you. But you start doing that and you realize pretty quick &mdash; man, I'm missing a lot
              of stuff I should have.
            </p>
            <p>
              Then I finally got curious about a Carver receiver that had been sitting in the corner
              for years &mdash; a gift from a friend I'd never been able to get working. Finally got fed up
              and asked AI about it. Turns out it's an incredible piece of equipment. Got the whole
              system set up properly for the first time and it was a completely different experience.
            </p>
            <p>
              That's really where Rekkrd came from. I wanted to know exactly what I had. So I built
              something to track it &mdash; started super simple, just scan an album, log it. We called it
              the Crowe Collection. Then it grew.
            </p>
            <p>
              I kept thinking about how long that Carver sat in the corner because I didn't understand
              what I had. Figured other people probably feel the same about their gear. That idea turned
              into Stakkd.
            </p>
          </div>
        </div>
      </section>

      <div className="about-divider">
        <div className="divider-line"></div>
        <div className="divider-icon"></div>
        <div className="divider-line"></div>
      </div>

      {/* FEATURES */}
      <section className="about-features">
        <p className="section-label">What We Built</p>
        <h2 className="features-heading">Everything your collection <em>actually</em> needs.</h2>
        <div className="features-grid">
          <div className="feature-card">
            <p className="feature-number">01</p>
            <p className="feature-name">AI Scanning</p>
            <p className="feature-desc">
              Point your camera at an album cover and we'll identify it instantly &mdash; pulling in
              full metadata, pressing info, and artwork.
            </p>
          </div>
          <div className="feature-card">
            <p className="feature-number">02</p>
            <p className="feature-name">Discogs Integration</p>
            <p className="feature-desc">
              Sync your existing Discogs collection and wantlist. Pull live pricing. One source of
              truth for everything you own.
            </p>
          </div>
          <div className="feature-card">
            <p className="feature-number">03</p>
            <p className="feature-name">Stakkd</p>
            <p className="feature-desc">
              Catalog your gear &mdash; turntables, receivers, speakers, carts. Understand what you have
              and get more out of your system.
            </p>
          </div>
        </div>
      </section>

      <div className="about-divider">
        <div className="divider-line"></div>
        <div className="divider-icon"></div>
        <div className="divider-line"></div>
      </div>

      {/* TEAM */}
      <section className="about-team">
        <p className="section-label">The People</p>
        <div className="team-grid">
          <div className="team-card">
            <div className="team-avatar">C</div>
            <p className="team-name">Clint Crowe</p>
            <p className="team-role">Founder &amp; Builder</p>
            <p className="team-bio">
              Farmer, technologist, and reluctant record collector. Built Rekkrd out of personal
              frustration and a Carver receiver that wouldn't quit.
            </p>
            <div className="team-links">
              <a href="https://sweetwaterurbanfarms.com/about" className="team-link" target="_blank" rel="noopener noreferrer">Sweetwater Urban Farms</a>
              <a href="https://sweetwater.technology" className="team-link" target="_blank" rel="noopener noreferrer">Sweetwater Technology</a>
            </div>
          </div>
          <div className="team-card">
            <div className="team-avatar" style={{ fontSize: '1rem', letterSpacing: '-1px' }}>SW</div>
            <p className="team-name">Sweetwater Technology</p>
            <p className="team-role">The Organization Behind Rekkrd</p>
            <p className="team-bio">
              We grow food and build software &mdash; sometimes in the same afternoon. Sweetwater Urban Farms
              and Sweetwater Technology operate out of the same belief: build things that solve real
              problems, from the ground up.
            </p>
            <div className="team-links">
              <a href="https://sweetwaterurbanfarms.com" className="team-link" target="_blank" rel="noopener noreferrer">sweetwaterurbanfarms.com</a>
              <a href="https://sweetwater.technology" className="team-link" target="_blank" rel="noopener noreferrer">sweetwater.technology</a>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <div className="about-cta">
        <div className="cta-text">
          <h2>Ready to <em>know</em> your collection?</h2>
          <p>Start free. No spreadsheets required.</p>
        </div>
        <Link to="/" className="btn-primary">Start for Free</Link>
      </div>

      {/* FOOTER */}
      <footer className="about-footer">
        <p className="footer-logo">
          <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" style={{ width: '1.4em', height: '1.4em', flexShrink: 0, verticalAlign: 'middle' }}>
            <circle cx="12" cy="12" r="11" fill="#2a2520"/>
            <circle cx="12" cy="12" r="9.5" fill="none" stroke="#3a3530" strokeWidth="0.4" opacity="0.5"/>
            <circle cx="12" cy="12" r="8" fill="none" stroke="#3a3530" strokeWidth="0.3" opacity="0.4"/>
            <circle cx="12" cy="12" r="6.5" fill="none" stroke="#3a3530" strokeWidth="0.3" opacity="0.3"/>
            <circle cx="12" cy="12" r="5.2" fill="#1a1916"/>
            <text x="12" y="12.5" textAnchor="middle" dominantBaseline="central" fontFamily="Georgia,serif" fontWeight="bold" fontSize="7" fill="#c45a30">R</text>
          </svg>
          Rekk<span style={{ color: '#c45a30' }}>r</span>d
        </p>
        <p className="footer-copy">&copy; {new Date().getFullYear()} <a href="https://sweetwater.technology" target="_blank" rel="noopener noreferrer">Sweetwater Technology</a>. All rights reserved.</p>
      </footer>
    </div>
  );
};

export default About;
