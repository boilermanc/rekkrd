import React, { useRef, useCallback, useState } from 'react';
import { useFocusTrap } from '../../hooks/useFocusTrap';
import '../../styles/stakkd-theme.css';

interface RoomGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type Tab = 'quickstart' | 'layout' | 'tips';

const RoomGuideModal: React.FC<RoomGuideModalProps> = ({ isOpen, onClose }) => {
  const modalRef = useRef<HTMLDivElement>(null);
  const stableOnClose = useCallback(onClose, [onClose]);
  useFocusTrap(modalRef, stableOnClose);
  const [activeTab, setActiveTab] = useState<Tab>('quickstart');

  if (!isOpen) return null;

  return (
    <div
      ref={modalRef}
      tabIndex={-1}
      role="dialog"
      aria-modal="true"
      aria-label="Room Planner Guide"
      className="fixed inset-0 z-[60] flex items-center justify-center bg-th-bg/95 p-2 md:p-6 backdrop-blur-xl animate-in fade-in duration-300 outline-none"
    >
      <div
        className="rog-modal relative w-full max-w-3xl max-h-[98vh] md:max-h-[95vh] rounded-3xl overflow-hidden border border-th-surface/[0.10] flex flex-col animate-in zoom-in-95 duration-500 bg-sk-bg"
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-30 w-10 h-10 rounded-full bg-sk-bg/80 text-sk-text flex items-center justify-center hover:bg-sk-text hover:text-sk-bg transition-all"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Scrollable content */}
        <div className="overflow-y-auto flex-1">

          {/* Hero */}
          <div className="rog-hero">
            <div className="rog-hero-eyebrow">// Rekkrd Room Planner</div>
            <h1>Plan Your<br /><em>Listening Space</em></h1>
            <p className="rog-hero-sub">Map your rooms, add wall features, and get AI-powered gear placement recommendations for optimal sound.</p>
          </div>

          {/* Tab navigation */}
          <div className="rog-tab-wrapper">
            <div className="rog-tab-nav">
              <button className={`rog-tab-btn${activeTab === 'quickstart' ? ' active' : ''}`} onClick={() => setActiveTab('quickstart')}>
                Quick Start
              </button>
              <button className={`rog-tab-btn${activeTab === 'layout' ? ' active' : ''}`} onClick={() => setActiveTab('layout')}>
                Layout Guide
              </button>
              <button className={`rog-tab-btn${activeTab === 'tips' ? ' active' : ''}`} onClick={() => setActiveTab('tips')}>
                Tips &amp; FAQ
              </button>
            </div>
          </div>

          {/* Content area */}
          <div className="rog-content">

            {/* ══════════════════════════════════
                TAB 1: QUICK START
            ══════════════════════════════════ */}
            <div className={`rog-panel${activeTab === 'quickstart' ? ' active' : ''}`}>
              <div className="rog-eyebrow">// Getting Started</div>
              <h2>Room Planner<br /><em>Quick Start</em></h2>
              <p>The Room Planner lets you map your listening spaces inside Rekkrd. Define your room&rsquo;s dimensions and features, then let AI recommend the optimal placement for every piece of gear in your setup.</p>

              <h3>Creating Your First Room</h3>
              <p>Click the <strong>Add Room</strong> button and fill in the details about your listening space. Here&rsquo;s what each field means.</p>

              <div className="rog-step-list">
                <div className="rog-step-item">
                  <div className="rog-step-number">1</div>
                  <div className="rog-step-content">
                    <h4>Name Your Room</h4>
                    <p>Give it a recognizable name, like &ldquo;Living Room&rdquo;, &ldquo;Studio&rdquo;, or &ldquo;Basement&rdquo;.</p>
                  </div>
                </div>
                <div className="rog-step-item">
                  <div className="rog-step-number">2</div>
                  <div className="rog-step-content">
                    <h4>Enter Dimensions</h4>
                    <p>Measure your room&rsquo;s width, length, and ceiling height in feet. Accurate measurements lead to better placement recommendations.</p>
                  </div>
                </div>
                <div className="rog-step-item">
                  <div className="rog-step-number">3</div>
                  <div className="rog-step-content">
                    <h4>Choose Room Shape</h4>
                    <p>Select <strong>Rectangular</strong>, <strong>L-Shaped</strong>, or <strong>Open Concept</strong> to match your space.</p>
                  </div>
                </div>
                <div className="rog-step-item">
                  <div className="rog-step-number">4</div>
                  <div className="rog-step-content">
                    <h4>Set Floor Type</h4>
                    <p>Hardwood, carpet, tile, concrete, or mixed. Floor type affects acoustic properties and the AI&rsquo;s recommendations.</p>
                  </div>
                </div>
                <div className="rog-step-item">
                  <div className="rog-step-number">5</div>
                  <div className="rog-step-content">
                    <h4>Pick Listening Position</h4>
                    <p>Where do you sit to listen? Choose from Centered, Desk (near wall), Couch (back third), or Near Wall.</p>
                  </div>
                </div>
              </div>

              <div className="rog-callout rog-callout-tip">
                <div className="rog-callout-icon">💡</div>
                <p><strong>Pro tip:</strong> Measure your room at floor level, wall-to-wall. If your room is irregular, use the closest rectangular approximation and note the differences in the notes field.</p>
              </div>

              <h3>Adding Wall Features</h3>
              <p>After creating your room, click the <strong>features icon</strong> on the room card. You can mark doors, windows, closets, fireplaces, stairs, and openings on each wall (North, South, East, West). This tells the AI where gear can and can&rsquo;t go.</p>

              <div className="rog-cta">
                <h3>Ready to Get Started?</h3>
                <p>Add your first room and start mapping your listening space.</p>
                <button onClick={onClose} className="rog-btn-primary">Back to Rooms</button>
              </div>
            </div>

            {/* ══════════════════════════════════
                TAB 2: LAYOUT GUIDE
            ══════════════════════════════════ */}
            <div className={`rog-panel${activeTab === 'layout' ? ' active' : ''}`}>
              <div className="rog-eyebrow">// AI Layout Features</div>
              <h2>Understanding<br /><em>AI Layouts</em></h2>
              <p>The AI Layout feature is where the magic happens. It analyzes your room dimensions, wall features, and gear catalog to recommend where every piece of equipment should go for optimal sound.</p>

              <h3>How It Works</h3>
              <p>Click the <strong>layout icon</strong> on any room card, then hit <strong>Generate Layout</strong>. The AI considers your room&rsquo;s shape, dimensions, floor type, listening position, wall features (doors, windows, etc.), and your full gear catalog to produce a placement plan.</p>

              <div className="rog-callout rog-callout-warning">
                <div className="rog-callout-icon">⚠️</div>
                <p><strong>Important:</strong> The AI needs gear in your Stakkd catalog to generate placements. Make sure you&rsquo;ve added your turntable, speakers, amp, and other equipment before generating a layout.</p>
              </div>

              <h3>The Room Diagram</h3>
              <p>The interactive diagram shows a top-down view of your room with walls, compass directions, dimension lines, and floor patterns. When a layout is generated, gear icons appear at their recommended positions with facing arrows.</p>

              <h3>Gear Placements</h3>
              <p>Each piece of gear gets a recommended <strong>position</strong> (shown as a percentage from the north and west walls) and a <strong>facing direction</strong> (north, south, east, or west). The sidebar lists every piece with its placement details and any specific notes from the AI.</p>

              <h3>Listening Position &amp; Sweet Spot</h3>
              <p>The AI marks your optimal listening position on the diagram &mdash; the &ldquo;sweet spot&rdquo; where stereo imaging and frequency response are at their best. This is based on your room geometry and speaker placement.</p>

              <h3>Stereo Triangle</h3>
              <p>When you have a pair of speakers, the AI calculates the <strong>stereo triangle</strong> &mdash; the angle between your left speaker, listening position, and right speaker. The ideal angle is around <strong>60 degrees</strong>, forming an equilateral triangle. The diagram shows this as connecting lines.</p>

              <div className="rog-info-grid">
                <div className="rog-info-card">
                  <div className="rog-info-card-icon">📍</div>
                  <h4>Placement</h4>
                  <p>Each piece gets a recommended position and facing direction based on acoustic principles.</p>
                </div>
                <div className="rog-info-card">
                  <div className="rog-info-card-icon">🎯</div>
                  <h4>Sweet Spot</h4>
                  <p>The ideal listening position based on your speakers and room geometry.</p>
                </div>
                <div className="rog-info-card">
                  <div className="rog-info-card-icon">🔺</div>
                  <h4>Stereo Triangle</h4>
                  <p>Optimal angle between speakers and listener for the best stereo imaging.</p>
                </div>
              </div>

              <h3>Saving &amp; Comparing Layouts</h3>
              <p>Each generated layout is automatically saved. You can <strong>rename</strong> layouts to remember what configuration they represent, <strong>switch</strong> between saved layouts to compare them, and <strong>delete</strong> layouts you no longer need. Only one layout can be active at a time.</p>

              <div className="rog-cta">
                <h3>Start Planning</h3>
                <p>Open a room, generate a layout, and find the perfect setup for your space.</p>
                <button onClick={onClose} className="rog-btn-primary">Back to Rooms</button>
              </div>
            </div>

            {/* ══════════════════════════════════
                TAB 3: TIPS & FAQ
            ══════════════════════════════════ */}
            <div className={`rog-panel${activeTab === 'tips' ? ' active' : ''}`}>
              <div className="rog-eyebrow">// Pro Tips</div>
              <h2>Tips &amp;<br /><em>FAQ</em></h2>
              <p>Common questions and pro tips to get the most out of the Room Planner.</p>

              <h3>Frequently Asked Questions</h3>

              <div className="rog-faq-item">
                <div className="rog-faq-q">How accurate are the AI recommendations?</div>
                <p className="rog-faq-a">The AI provides a strong starting point based on acoustic principles and room geometry. Use the recommendations as a guide, then fine-tune by listening. Every room has unique characteristics that affect sound.</p>
              </div>

              <div className="rog-faq-item">
                <div className="rog-faq-q">Can I have multiple rooms?</div>
                <p className="rog-faq-a">Yes! Add as many rooms as you like. Each room has its own dimensions, wall features, and saved layouts. Great if you have a living room setup and a dedicated listening room.</p>
              </div>

              <div className="rog-faq-item">
                <div className="rog-faq-q">Why do I need to add wall features?</div>
                <p className="rog-faq-a">Doors, windows, and openings affect where gear can be placed. A speaker in front of a doorway isn&rsquo;t practical, and windows cause acoustic reflections. The more detail you provide, the better the recommendations.</p>
              </div>

              <div className="rog-faq-item">
                <div className="rog-faq-q">What floor type should I choose?</div>
                <p className="rog-faq-a">Pick the primary flooring in your listening area. Carpet absorbs sound (warmer tone), hardwood reflects it (brighter, more reverberant), and the AI adjusts its recommendations accordingly.</p>
              </div>

              <div className="rog-faq-item">
                <div className="rog-faq-q">How many layouts can I save?</div>
                <p className="rog-faq-a">There&rsquo;s no hard limit. Generate multiple layouts, compare them side-by-side, and activate whichever configuration works best for your space.</p>
              </div>

              <div className="rog-faq-item">
                <div className="rog-faq-q">Does the Room Planner move my physical gear?</div>
                <p className="rog-faq-a">No &mdash; the Room Planner is a visualization and recommendation tool. You&rsquo;ll need to physically rearrange your setup based on the AI&rsquo;s suggestions.</p>
              </div>

              <div className="rog-divider" style={{ margin: '2rem 0' }} />

              <h3>Pro Tips</h3>

              <div className="rog-callout rog-callout-tip">
                <div className="rog-callout-icon">💡</div>
                <p><strong>Measure twice, enter once.</strong> Accurate room dimensions make a big difference in placement quality. Use a tape measure, not estimates.</p>
              </div>

              <div className="rog-callout rog-callout-tip">
                <div className="rog-callout-icon">💡</div>
                <p><strong>Mark all reflective surfaces.</strong> Windows and bare walls create first reflections that affect sound quality. Add them as wall features so the AI can account for them.</p>
              </div>

              <div className="rog-callout rog-callout-tip">
                <div className="rog-callout-icon">💡</div>
                <p><strong>Start with the stereo triangle.</strong> Get your speakers and listening position right first, then place the turntable and amplifier around that foundation.</p>
              </div>

              <div className="rog-callout rog-callout-tip">
                <div className="rog-callout-icon">💡</div>
                <p><strong>Try multiple layouts.</strong> Generate 2&ndash;3 different layouts and compare them. Small changes in room setup can dramatically affect the AI&rsquo;s recommendations.</p>
              </div>

              <div className="rog-cta">
                <h3>Happy Listening!</h3>
                <p>Your room, your sound. Plan once, enjoy forever.</p>
                <button onClick={onClose} className="rog-btn-primary">Back to Rooms</button>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
};

export default RoomGuideModal;
