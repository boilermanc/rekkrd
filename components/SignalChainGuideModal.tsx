import React, { useRef, useCallback, useState } from 'react';
import { useFocusTrap } from '../hooks/useFocusTrap';
import './SignalChainGuideModal.css';

interface SignalChainGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type Tab = 'dummies' | 'deepdive' | 'setup';

const SignalChainGuideModal: React.FC<SignalChainGuideModalProps> = ({ isOpen, onClose }) => {
  const modalRef = useRef<HTMLDivElement>(null);
  const stableOnClose = useCallback(onClose, [onClose]);
  useFocusTrap(modalRef, stableOnClose);
  const [activeTab, setActiveTab] = useState<Tab>('dummies');

  if (!isOpen) return null;

  return (
    <div
      ref={modalRef}
      tabIndex={-1}
      role="dialog"
      aria-modal="true"
      aria-label="Signal Chain Guide"
      className="fixed inset-0 z-[60] flex items-center justify-center bg-th-bg/95 p-2 md:p-6 backdrop-blur-xl animate-in fade-in duration-300 outline-none"
    >
      <div className="scg-modal relative w-full max-w-3xl max-h-[98vh] md:max-h-[95vh] rounded-3xl overflow-hidden border border-th-surface/[0.10] flex flex-col animate-in zoom-in-95 duration-500"
        style={{ background: '#1a2528' }}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-30 w-10 h-10 rounded-full bg-[#1a2528]/80 text-[#e8e2d6] flex items-center justify-center hover:bg-[#e8e2d6] hover:text-[#1a2528] transition-all"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Scrollable content */}
        <div className="overflow-y-auto flex-1">

          {/* Hero */}
          <div className="scg-hero">
            <div className="scg-hero-eyebrow">// Stakkd by Rekkrd</div>
            <h1>Understanding Your<br /><em>Signal Chain</em></h1>
            <p className="scg-hero-sub">From the groove to your ears — everything you need to know about how your vinyl rig works, and how Stakkd helps you master it.</p>
          </div>

          {/* Tab navigation */}
          <div className="scg-tab-wrapper">
            <div className="scg-tab-nav">
              <button className={`scg-tab-btn${activeTab === 'dummies' ? ' active' : ''}`} onClick={() => setActiveTab('dummies')}>
                Signal Chain for Dummies
              </button>
              <button className={`scg-tab-btn${activeTab === 'deepdive' ? ' active' : ''}`} onClick={() => setActiveTab('deepdive')}>
                Deep Dive
              </button>
              <button className={`scg-tab-btn${activeTab === 'setup' ? ' active' : ''}`} onClick={() => setActiveTab('setup')}>
                Setup in Stakkd
              </button>
            </div>
          </div>

          {/* Content area */}
          <div className="scg-content">

            {/* ══════════════════════════════════
                TAB 1: FOR DUMMIES
            ══════════════════════════════════ */}
            <div className={`scg-panel${activeTab === 'dummies' ? ' active' : ''}`}>
              <div className="scg-eyebrow">// The Basics</div>
              <h2>Signal Chain<br /><em>for Dummies</em></h2>
              <p>You've got a turntable, some records, and you're ready to dive into the warm, wonderful world of vinyl. You might hear audiophiles talking about their "signal chain" and it can sound intimidating. Don't worry — at its core, it's a simple and powerful concept you already understand intuitively.</p>

              <h3>What is a Signal Chain?</h3>
              <p>Imagine your stereo system is like a series of connected pipes. Your music is the water flowing through them. The <strong>signal chain</strong> is simply the path that audio signal takes from its source — the record — to its final destination — your ears.</p>
              <p>Each part of the chain is a different component in your setup. Each one has a specific job to do, and each one affects the final sound you hear. If one pipe is rusty or clogged, the water won't flow as cleanly. The same is true for your audio signal.</p>

              <h3>The Four Key Players</h3>
              <p>For a typical vinyl setup, your signal chain has four essential components. Think of them as a band — each member needs to do their part for the music to sound great.</p>

              <div className="scg-chain-visual">
                <div className="scg-chain-node">
                  <div className="scg-chain-node-icon">🎵</div>
                  <div className="scg-chain-node-info">
                    <div className="scg-chain-node-label">Step 1 — The Source</div>
                    <div className="scg-chain-node-name">Turntable</div>
                    <div className="scg-chain-node-desc">Stylus reads the groove, creates a tiny electrical signal</div>
                  </div>
                  <span className="scg-chain-signal scg-signal-phono">Phono Level</span>
                </div>
                <div className="scg-chain-arrow">
                  <div className="scg-chain-arrow-line"></div>
                  <div className="scg-chain-signal-label">~2–8 mV</div>
                  <div className="scg-chain-arrow-head"></div>
                </div>
                <div className="scg-chain-node">
                  <div className="scg-chain-node-icon">🔌</div>
                  <div className="scg-chain-node-info">
                    <div className="scg-chain-node-label">Step 2 — The Translator</div>
                    <div className="scg-chain-node-name">Phono Preamp</div>
                    <div className="scg-chain-node-desc">Boosts the signal &amp; applies RIAA EQ correction</div>
                  </div>
                  <span className="scg-chain-signal scg-signal-line">Line Level</span>
                </div>
                <div className="scg-chain-arrow">
                  <div className="scg-chain-arrow-line"></div>
                  <div className="scg-chain-signal-label">~200–2,000 mV</div>
                  <div className="scg-chain-arrow-head"></div>
                </div>
                <div className="scg-chain-node">
                  <div className="scg-chain-node-icon">🔊</div>
                  <div className="scg-chain-node-info">
                    <div className="scg-chain-node-label">Step 3 — The Muscle</div>
                    <div className="scg-chain-node-name">Amplifier</div>
                    <div className="scg-chain-node-desc">Powers the signal to drive your speakers</div>
                  </div>
                  <span className="scg-chain-signal scg-signal-speaker">Speaker Level</span>
                </div>
                <div className="scg-chain-arrow">
                  <div className="scg-chain-arrow-line"></div>
                  <div className="scg-chain-signal-label">High Power</div>
                  <div className="scg-chain-arrow-head"></div>
                </div>
                <div className="scg-chain-node">
                  <div className="scg-chain-node-icon">🎶</div>
                  <div className="scg-chain-node-info">
                    <div className="scg-chain-node-label">Step 4 — The Voice</div>
                    <div className="scg-chain-node-name">Speakers</div>
                    <div className="scg-chain-node-desc">Converts electrical signal into sound waves you can hear</div>
                  </div>
                  <span className="scg-chain-signal scg-signal-phono">Sound Waves</span>
                </div>
              </div>

              <h3>What Each Component Actually Does</h3>
              <table className="scg-table">
                <thead>
                  <tr><th>Component</th><th>Role</th><th>The Analogy</th><th>Without It...</th></tr>
                </thead>
                <tbody>
                  <tr><td>Turntable</td><td>Creates the initial audio signal from the record groove</td><td>The Reservoir — where it all begins</td><td>No music at all</td></tr>
                  <tr><td>Phono Preamp</td><td>Boosts the signal to line level &amp; applies RIAA equalization</td><td>The Pump &amp; Purifier — makes it usable</td><td>Barely audible, thin, tinny sound</td></tr>
                  <tr><td>Amplifier</td><td>Powers the line-level signal to drive speakers</td><td>The Water Tower — stores &amp; delivers power</td><td>No volume, no dynamics</td></tr>
                  <tr><td>Speakers</td><td>Converts electrical signal into sound waves</td><td>The Faucet — the final delivery point</td><td>No sound in the room</td></tr>
                </tbody>
              </table>

              <h3>Why Does the Order Matter?</h3>
              <p>Just like you can't put a faucet before the water pump, the order of your signal chain is critical. Each component is designed to receive a specific type of signal and send out another. The turntable sends out a <strong>phono level</strong> signal, the preamp boosts it to <strong>line level</strong>, the amplifier boosts that to <strong>speaker level</strong>, and the speakers turn that into sound.</p>

              <blockquote>
                <p><strong>The most common mistake in a new vinyl setup?</strong> Connecting a turntable directly to an amplifier that doesn't have a dedicated PHONO input — and wondering why the music sounds quiet and thin. The phono preamp is not optional. It's the translator your system cannot work without.</p>
              </blockquote>

              <h3>See It in Stakkd</h3>
              <p>The best part? You don't have to guess what your signal chain looks like. The <strong>Stakkd</strong> feature in your Rekkrd app visualizes it for you automatically. When you add your gear, Stakkd lays it all out — showing you the exact path your music is taking. You can even drag and drop components to experiment with different configurations.</p>
              <p>Understanding your signal chain is the first step to troubleshooting problems and making meaningful upgrades to your system. Now that you know the basics, you're ready to explore the deeper magic of how it all works together.</p>

              <div className="scg-cta">
                <h3>See Your Signal Chain in Stakkd</h3>
                <p>Add your gear to Stakkd and watch your signal chain come to life — automatically visualized and organized.</p>
                <button onClick={onClose} className="scg-btn-primary">Back to Stakkd</button>
              </div>
            </div>

            {/* ══════════════════════════════════
                TAB 2: DEEP DIVE
            ══════════════════════════════════ */}
            <div className={`scg-panel${activeTab === 'deepdive' ? ' active' : ''}`}>
              <div className="scg-eyebrow">// For the Serious Listener</div>
              <h2>Signal Chain<br /><em>Deep Dive</em></h2>
              <p>You understand the basic path your audio takes. Now it's time to look closer at the critical links in that chain. This is where you can make targeted tweaks and upgrades that transform your listening experience from good to sublime. We'll explore the technical concepts that govern how your gear interacts — and how Stakkd helps you master them.</p>

              <h3>The Cartridge &amp; Stylus: Where Sound is Born</h3>
              <p>The journey begins at the very tip of your stylus. This tiny diamond, navigating the microscopic contours of a record groove, is where mechanical motion becomes an electrical signal. The quality of this initial conversion is paramount — any detail lost here can never be recovered downstream.</p>

              <div className="scg-info-grid">
                <div className="scg-info-card">
                  <div className="scg-info-card-icon">🧲</div>
                  <h4>Moving Magnet (MM)</h4>
                  <p>The most common type. A tiny magnet attached to the stylus moves within fixed coils, inducing a current. MM cartridges are affordable, have user-replaceable styli, and output a relatively strong signal (2–8 mV). An excellent starting point for most setups.</p>
                </div>
                <div className="scg-info-card">
                  <div className="scg-info-card-icon">⚡</div>
                  <h4>Moving Coil (MC)</h4>
                  <p>The audiophile's choice. The coils are attached to the stylus and move within a fixed magnetic field. MC cartridges are more expensive with a much lower output (&lt;1.0 mV), but are widely praised for superior detail, speed, and sonic accuracy.</p>
                </div>
              </div>

              <h3>The Phono Preamp: The Unsung Hero's Technical Task</h3>
              <p>As covered in the basics, the phono preamp has two jobs: boosting the signal and applying RIAA equalization. But let's break down exactly why this matters so much.</p>

              <blockquote>
                <p><strong>RIAA Equalization Explained:</strong> To fit the long bass waves into a record groove and reduce surface noise, the original audio is altered before being pressed to vinyl — bass frequencies are cut, and treble frequencies are boosted. The RIAA curve is the industry-standard equalization curve that reverses this process during playback. Your phono preamp applies this precise curve, boosting the bass and cutting the treble to restore the music to its original, intended balance.</p>
              </blockquote>

              <p>For the serious enthusiast, three key preamp settings can be optimized to perfectly match your cartridge:</p>

              <h4>1. Gain</h4>
              <p>Gain is the amount of amplification the preamp applies. It must be set correctly to match your cartridge's output voltage. Too little gain and the signal will be too quiet, requiring you to crank your main amplifier and raise the noise floor. Too much gain risks "clipping" the signal, causing audible distortion.</p>

              <table className="scg-table">
                <thead>
                  <tr><th>Cartridge Type</th><th>Typical Output</th><th>Recommended Gain</th><th>Notes</th></tr>
                </thead>
                <tbody>
                  <tr><td><span className="scg-tag scg-tag-mm">MM</span> Moving Magnet</td><td>2–8 mV</td><td>40–50 dB</td><td>Standard on most phono preamps</td></tr>
                  <tr><td><span className="scg-tag scg-tag-mc">MC</span> Moving Coil (High Output)</td><td>1–2.5 mV</td><td>50–60 dB</td><td>Can often use MM input</td></tr>
                  <tr><td><span className="scg-tag scg-tag-mc">MC</span> Moving Coil (Low Output)</td><td>0.1–0.5 mV</td><td>60–70 dB</td><td>Requires dedicated MC stage</td></tr>
                </tbody>
              </table>

              <h4>2. Impedance Loading</h4>
              <p>Impedance, measured in ohms (Ω), is an electrical property that affects the transfer of signal from the cartridge to the preamp. Proper impedance matching is crucial for a flat frequency response. Mismatched impedance can cause a peak or dip in the high frequencies, making the sound either harsh and bright or dull and lifeless.</p>

              <table className="scg-table">
                <thead>
                  <tr><th>Cartridge Type</th><th>Standard Load</th><th>Effect of Wrong Load</th></tr>
                </thead>
                <tbody>
                  <tr><td><span className="scg-tag scg-tag-mm">MM</span></td><td>47,000 Ω (47 kΩ) — universal standard</td><td>Rarely an issue; most preamps are fixed at 47 kΩ</td></tr>
                  <tr><td><span className="scg-tag scg-tag-mc">MC</span></td><td>Varies: 20 Ω – 1,000+ Ω (check manufacturer specs)</td><td>Too low = dull, rolled-off highs. Too high = bright, harsh sound</td></tr>
                </tbody>
              </table>

              <h4>3. Capacitance</h4>
              <p>Measured in picofarads (pF), capacitance is an electrical load that primarily affects MM cartridges. The total capacitance is a sum of the capacitance in your tonearm cables and the preamp's input. Too much capacitance can cause a peak in the high-mid frequencies, resulting in a harsh, forward sound. The goal is to match the total capacitance to the cartridge manufacturer's recommendation — typically between 100 pF and 400 pF total.</p>

              <div className="scg-callout scg-callout-tip">
                <div className="scg-callout-icon">💡</div>
                <p><strong>Pro tip:</strong> When you identify your cartridge in Stakkd, the app pulls up its full spec sheet — including the recommended impedance and capacitance loading. This takes the guesswork out of configuring your phono preamp for the first time.</p>
              </div>

              <h3>Tonearm, Tracking Force &amp; Alignment</h3>
              <p>The tonearm is the mechanical bridge between your cartridge and the turntable. Its job is to hold the cartridge at precisely the right angle and with precisely the right downward pressure (tracking force) as it traverses the record. Getting these settings right is critical for both sound quality and protecting your records from premature wear.</p>

              <table className="scg-table">
                <thead>
                  <tr><th>Setting</th><th>What It Does</th><th>Consequence of Getting It Wrong</th></tr>
                </thead>
                <tbody>
                  <tr><td>Tracking Force (VTF)</td><td>Controls downward pressure of stylus on the groove</td><td>Too light: mistracking &amp; distortion. Too heavy: record &amp; stylus wear</td></tr>
                  <tr><td>Anti-Skate</td><td>Counteracts the inward pull of the stylus toward the record center</td><td>Uneven channel balance, distortion on one side, uneven groove wear</td></tr>
                  <tr><td>Cartridge Alignment (Azimuth, VTA)</td><td>Ensures the stylus sits correctly in the groove at the right angle</td><td>Tracking errors, channel imbalance, accelerated record wear</td></tr>
                </tbody>
              </table>

              <h3>Cables &amp; Grounding: The Hidden Variables</h3>
              <p>Cables are the connective tissue of your signal chain. At the phono level — where the signal is at its most delicate — cable quality and proper grounding have an outsized impact on the noise floor of your system.</p>
              <p><strong>Shielding</strong> protects the cable's inner conductors from electromagnetic interference (EMI) and radio frequency interference (RFI) generated by nearby electronics, power supplies, and motors. At phono level, even a small amount of interference can be amplified into an audible hum by the time it reaches your speakers.</p>
              <p><strong>Grounding</strong> is the process of creating a common electrical reference point between your turntable and phono preamp. Most turntables have a dedicated ground wire (a thin, bare wire) that must be connected to the ground terminal on your phono preamp or amplifier. Failing to do this is the most common cause of an audible 50/60 Hz hum in a vinyl setup.</p>

              <div className="scg-callout scg-callout-warning">
                <div className="scg-callout-icon">⚠️</div>
                <p><strong>Hum troubleshooting:</strong> If you hear a constant low hum from your speakers, check your ground wire connection first. It's the most common culprit and the easiest fix. Ensure the wire is securely connected to the ground terminal on your phono preamp or amplifier.</p>
              </div>

              <h3>Using Stakkd for Advanced Signal Chain Management</h3>
              <p>Stakkd isn't just for beginners. It's a powerful tool for managing the complex interactions between your components:</p>

              <div className="scg-info-grid">
                <div className="scg-info-card">
                  <div className="scg-info-card-icon">📋</div>
                  <h4>Component Specs Database</h4>
                  <p>When you identify your gear, Stakkd pulls up its full specifications — including cartridge type (MM/MC), recommended tracking force, and suggested impedance and capacitance loading.</p>
                </div>
                <div className="scg-info-card">
                  <div className="scg-info-card-icon">📖</div>
                  <h4>Automatic Manual Finder</h4>
                  <p>Stakkd automatically locates the PDF manual for every piece of gear you add. These are invaluable for finding detailed setup instructions and fine-tuning specifications.</p>
                </div>
                <div className="scg-info-card">
                  <div className="scg-info-card-icon">🔍</div>
                  <h4>Visual Troubleshooting</h4>
                  <p>By visualizing your entire chain, you can spot potential issues at a glance — like running a low-output MC cartridge into a standard MM-only phono input, immediately explaining a thin, quiet sound.</p>
                </div>
              </div>

              <p>By understanding these deeper concepts, you can move beyond simply connecting your gear and start truly <em>optimizing</em> it. The result is a sound that is cleaner, more detailed, and more faithful to the original recording — the true goal of any audiophile.</p>

              <div className="scg-cta">
                <h3>Ready to Optimize Your Rig?</h3>
                <p>Add your gear to Stakkd and unlock specs, manuals, and a full signal chain visualization tailored to your exact setup.</p>
                <button onClick={onClose} className="scg-btn-primary">Back to Stakkd</button>
              </div>
            </div>

            {/* ══════════════════════════════════
                TAB 3: SETUP IN STAKKD
            ══════════════════════════════════ */}
            <div className={`scg-panel${activeTab === 'setup' ? ' active' : ''}`}>
              <div className="scg-eyebrow">// Practical Guide</div>
              <h2>How to Set Up Your Signal Chain<br /><em>in Stakkd</em></h2>
              <p>Now that you understand what a signal chain is and why it matters, let's put that knowledge to work. The Stakkd app is designed to make managing your gear and understanding your signal path simple and intuitive. Here's how to get started — step by step.</p>

              <h3>Step 1: Add Your Gear</h3>
              <p>Before Stakkd can visualize your signal chain, it needs to know what you're working with. This is the foundation of your entire audio setup within the app.</p>

              <div className="scg-step-list">
                <div className="scg-step-item">
                  <div className="scg-step-number">1</div>
                  <div className="scg-step-content">
                    <h4>Open the Stakkd Feature</h4>
                    <p>Navigate to the Stakkd section in your Rekkrd app from the main navigation.</p>
                  </div>
                </div>
                <div className="scg-step-item">
                  <div className="scg-step-number">2</div>
                  <div className="scg-step-content">
                    <h4>Add a Component</h4>
                    <p>Tap the '+' or 'Add Gear' button to begin adding a new piece of equipment to your rig.</p>
                  </div>
                </div>
                <div className="scg-step-item">
                  <div className="scg-step-number">3</div>
                  <div className="scg-step-content">
                    <h4>Snap a Photo</h4>
                    <p>Use your phone's camera to take a clear picture of your turntable, amplifier, phono preamp, or speakers. The AI will identify the exact make and model instantly.</p>
                  </div>
                </div>
                <div className="scg-step-item">
                  <div className="scg-step-number">4</div>
                  <div className="scg-step-content">
                    <h4>Confirm or Enter Manually</h4>
                    <p>If the AI finds a match, confirm it. If not, you can easily search for and add your component manually from the gear database.</p>
                  </div>
                </div>
                <div className="scg-step-item">
                  <div className="scg-step-number">5</div>
                  <div className="scg-step-content">
                    <h4>Repeat for All Gear</h4>
                    <p>Do this for every component in your audio path — from the turntable to the speakers. The more gear you add, the more powerful Stakkd becomes.</p>
                  </div>
                </div>
              </div>

              <div className="scg-callout scg-callout-tip">
                <div className="scg-callout-icon">💡</div>
                <p><strong>Pro tip:</strong> Don't forget to add your phono preamp if it's a separate unit. This is the component most often overlooked, and it's the one Stakkd can provide the most useful guidance on — including gain and loading settings for your specific cartridge.</p>
              </div>

              <div className="scg-divider"></div>

              <h3>Step 2: Your Signal Chain, Visualized</h3>
              <p>Once you've added at least a source (like a turntable) and an output (like speakers), Stakkd automatically generates your signal chain visualization. You don't have to do anything else — it just appears.</p>
              <p>You will see a clear, top-to-bottom flow diagram showing each piece of gear connected in order. For a standard setup, it will look exactly like this:</p>

              <div className="scg-chain-visual" style={{ margin: '1.5rem 0' }}>
                <div className="scg-chain-node">
                  <div className="scg-chain-node-icon">🎵</div>
                  <div className="scg-chain-node-info">
                    <div className="scg-chain-node-label">Turntable</div>
                    <div className="scg-chain-node-name">e.g., Technics SL-1200MK7</div>
                  </div>
                  <span className="scg-chain-signal scg-signal-phono">Phono</span>
                </div>
                <div className="scg-chain-arrow"><div className="scg-chain-arrow-line"></div><div className="scg-chain-arrow-head"></div></div>
                <div className="scg-chain-node">
                  <div className="scg-chain-node-icon">🔌</div>
                  <div className="scg-chain-node-info">
                    <div className="scg-chain-node-label">Phono Preamp</div>
                    <div className="scg-chain-node-name">e.g., Pro-Ject Phono Box S2</div>
                  </div>
                  <span className="scg-chain-signal scg-signal-line">Line</span>
                </div>
                <div className="scg-chain-arrow"><div className="scg-chain-arrow-line"></div><div className="scg-chain-arrow-head"></div></div>
                <div className="scg-chain-node">
                  <div className="scg-chain-node-icon">🔊</div>
                  <div className="scg-chain-node-info">
                    <div className="scg-chain-node-label">Amplifier</div>
                    <div className="scg-chain-node-name">e.g., Yamaha A-S801</div>
                  </div>
                  <span className="scg-chain-signal scg-signal-speaker">Speaker</span>
                </div>
                <div className="scg-chain-arrow"><div className="scg-chain-arrow-line"></div><div className="scg-chain-arrow-head"></div></div>
                <div className="scg-chain-node">
                  <div className="scg-chain-node-icon">🎶</div>
                  <div className="scg-chain-node-info">
                    <div className="scg-chain-node-label">Speakers</div>
                    <div className="scg-chain-node-name">e.g., KEF LS50 Meta</div>
                  </div>
                  <span className="scg-chain-signal scg-signal-phono">Sound</span>
                </div>
              </div>

              <div className="scg-divider"></div>

              <h3>Step 3: What the Visualization Tells You</h3>
              <p>This isn't just a pretty picture — it's a diagnostic tool. At a glance, you can answer critical questions about your setup:</p>

              <table className="scg-table">
                <thead>
                  <tr><th>Question</th><th>What to Look For</th></tr>
                </thead>
                <tbody>
                  <tr><td>Is everything in the right order?</td><td>The diagram follows the actual path of the audio signal. If something looks out of place, it probably is.</td></tr>
                  <tr><td>Am I missing a component?</td><td>If your turntable connects directly to an amplifier with no phono preamp in between (and your amp has no PHONO input), that gap will be immediately visible.</td></tr>
                  <tr><td>What signal type is going where?</td><td>Each node shows its signal type (Phono, Line, Speaker). You can see exactly where the signal is being transformed at each stage.</td></tr>
                  <tr><td>What are my component's specs?</td><td>Tap any component to access its full specifications, including cartridge type, recommended tracking force, and loading settings.</td></tr>
                </tbody>
              </table>

              <div className="scg-divider"></div>

              <h3>Step 4: Drag, Drop &amp; Experiment</h3>
              <p>For most users, the standard signal chain is all you'll need. But for those with more complex setups — perhaps involving equalizers, effects units, or tape decks — Stakkd allows you to re-order your components.</p>
              <p>Simply <strong>press and hold</strong> any component in your visualized chain, then <strong>drag it</strong> to a new position. Stakkd will show you how this changes the flow of your audio path.</p>

              <div className="scg-callout scg-callout-warning">
                <div className="scg-callout-icon">⚠️</div>
                <p><strong>Important:</strong> For a standard vinyl setup, the Turntable → Phono Preamp → Amplifier → Speakers order is almost always correct. Only re-order components if you are an advanced user and know exactly why you are doing it.</p>
              </div>

              <div className="scg-divider"></div>

              <h3>Putting It All Together</h3>
              <p>Your signal chain in Stakkd is your audio roadmap — a living document of your hi-fi system. Use it to <strong>learn</strong> how your components work together, to <strong>troubleshoot</strong> problems when the sound isn't right, and to <strong>plan</strong> your next upgrade by seeing exactly where a new component would fit in the chain.</p>
              <p>By combining the knowledge from the beginner's guide and the deep dive with the practical visualization in Stakkd, you have everything you need to take full control of your sound — and ensure your vinyl collection is heard exactly as it was meant to be.</p>

              <div className="scg-cta">
                <h3>Your Rig, Documented.</h3>
                <p>Start building your Stakkd today. Add your gear, visualize your signal chain, and discover what your setup is truly capable of.</p>
                <button onClick={onClose} className="scg-btn-primary">Back to Stakkd</button>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
};

export default SignalChainGuideModal;
