import { sendRichJH } from '../../lib/jhrich.js'

const HTML = `
<style>
* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
  -webkit-tap-highlight-color: transparent;
  -webkit-user-select: none;
  user-select: none;
}

body {
  background: transparent;
  font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
  color: #edf4f4;
  padding: 10px;
}

.cr-wrap {
  width: 100%;
  max-width: 450px;
  margin: 0 auto;
}

.cr-card {
  position: relative;
  overflow: hidden;
  border-radius: 20px;
  background: linear-gradient(155deg, #101820 0%, #0b1016 55%, #10151d 100%);
  border: 1px solid rgba(133, 220, 205, 0.28);
  box-shadow: 0 14px 35px rgba(0, 0, 0, 0.45);
}

.cr-card::before {
  content: '';
  position: absolute;
  width: 260px;
  height: 260px;
  top: -150px;
  right: -100px;
  background: radial-gradient(circle, rgba(108, 220, 196, 0.13), transparent 70%);
  pointer-events: none;
}

.cr-card::after {
  content: '';
  position: absolute;
  width: 240px;
  height: 240px;
  bottom: 150px;
  left: -180px;
  background: radial-gradient(circle, rgba(119, 168, 224, 0.08), transparent 70%);
  pointer-events: none;
}

.cr-header {
  position: relative;
  padding: 27px 18px 23px;
  text-align: center;
  overflow: hidden;
  background: linear-gradient(
    140deg,
    rgba(108, 220, 196, 0.09),
    rgba(255, 255, 255, 0.015) 55%,
    rgba(108, 220, 196, 0.035)
  );
  border-bottom: 1px solid rgba(133, 220, 205, 0.17);
}

.cr-brand {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  color: #91dfce;
  font-size: 11px;
  font-weight: 900;
  letter-spacing: 4px;
  text-transform: uppercase;
  margin-bottom: 11px;
}

.cr-brand-mark {
  display: inline-flex;
  width: 22px;
  height: 22px;
  align-items: center;
  justify-content: center;
  border-radius: 7px;
  border: 1px solid rgba(145, 223, 206, 0.6);
  background: rgba(145, 223, 206, 0.1);
  font-size: 11px;
  letter-spacing: 0;
}

.cr-title {
  color: #f3f7f7;
  font-size: clamp(23px, 6vw, 30px);
  line-height: 1.2;
  font-weight: 900;
  letter-spacing: 1px;
}

.cr-title span {
  color: #91dfce;
}

.cr-description {
  margin-top: 10px;
  color: #99a9b2;
  font-size: 11px;
  font-weight: 600;
  line-height: 1.7;
  letter-spacing: 1.2px;
  text-transform: uppercase;
}

.cr-badge {
  display: inline-block;
  margin-top: 16px;
  padding: 7px 12px;
  border-radius: 20px;
  background: rgba(145, 223, 206, 0.08);
  border: 1px solid rgba(145, 223, 206, 0.22);
  color: #b3e9dc;
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 1px;
}

.cr-body {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  gap: 11px;
  padding: 16px;
}

.cr-section {
  position: relative;
  padding: 13px 13px 14px;
  border-radius: 13px;
  background: linear-gradient(
    120deg,
    rgba(255, 255, 255, 0.045),
    rgba(255, 255, 255, 0.018)
  );
  border: 1px solid rgba(255, 255, 255, 0.045);
  border-left: 3px solid var(--accent);
}

.cr-section-head {
  display: flex;
  align-items: center;
  gap: 9px;
  margin-bottom: 11px;
}

.cr-icon {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  width: 29px;
  height: 29px;
  border-radius: 9px;
  background: var(--icon-bg);
  font-size: 14px;
}

.cr-heading {
  color: var(--accent);
  font-size: 11px;
  line-height: 1.5;
  font-weight: 900;
  letter-spacing: 1px;
  text-transform: uppercase;
}

.cr-caption {
  margin-top: 2px;
  color: #7f919c;
  font-size: 10px;
  line-height: 1.5;
}

.cr-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding-left: 2px;
}

.cr-item {
  position: relative;
  padding-left: 15px;
  color: #e4eded;
  font-size: 12px;
  line-height: 1.55;
  font-weight: 650;
  overflow-wrap: anywhere;
}

.cr-item::before {
  content: '';
  position: absolute;
  top: 7px;
  left: 0;
  width: 5px;
  height: 5px;
  border-radius: 2px;
  background: var(--accent);
  opacity: 0.8;
}

.cr-item span {
  display: block;
  margin-top: 1px;
  color: #91a0aa;
  font-size: 10px;
  line-height: 1.6;
  font-weight: 500;
}

.cr-community {
  --accent: #91dfce;
  --icon-bg: rgba(145, 223, 206, 0.1);
}

.cr-corporate {
  --accent: #d6bd91;
  --icon-bg: rgba(214, 189, 145, 0.1);
}

.cr-foundation {
  --accent: #a9c5ef;
  --icon-bg: rgba(169, 197, 239, 0.1);
}

.cr-contributor {
  --accent: #c4a9ef;
  --icon-bg: rgba(196, 169, 239, 0.1);
}

.cr-quality {
  --accent: #efaaa9;
  --icon-bg: rgba(239, 170, 169, 0.1);
}

.cr-infrastructure {
  --accent: #91cbe3;
  --icon-bg: rgba(145, 203, 227, 0.1);
}

.cr-thanks {
  --accent: #e3e8eb;
  --icon-bg: rgba(227, 232, 235, 0.08);
}

.cr-footer {
  position: relative;
  z-index: 1;
  padding: 18px 17px 20px;
  text-align: center;
  border-top: 1px solid rgba(145, 223, 206, 0.16);
  background: rgba(145, 223, 206, 0.035);
}

.cr-footer-title {
  margin-bottom: 7px;
  color: #b6e9dd;
  font-size: 10px;
  font-weight: 900;
  letter-spacing: 2px;
  text-transform: uppercase;
}

.cr-footer-text {
  color: #95a4ad;
  font-size: 11px;
  line-height: 1.8;
}

.cr-footer-text strong {
  color: #e7d2a6;
  font-weight: 800;
}

.cr-divider {
  width: 35px;
  height: 2px;
  margin: 12px auto;
  border-radius: 5px;
  background: linear-gradient(90deg, transparent, #91dfce, transparent);
}

.cr-copyright {
  color: #647781;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 1.5px;
}
</style>

<div class="cr-wrap">
  <div class="cr-card">

    <div class="cr-header">
      <div class="cr-brand">
        <span class="cr-brand-mark">E</span>
        ELYRA LABS
      </div>

      <div class="cr-title">
        CREDITS <span>&</span> THANKS
      </div>

      <div class="cr-description">
        Community · Development · Collaboration
      </div>

      <div class="cr-badge">
        ✦ BUILT WITH THE COMMUNITY ✦
      </div>
    </div>

    <div class="cr-body">

      <div class="cr-section cr-community">
        <div class="cr-section-head">
          <div class="cr-icon">🌿</div>
          <div>
            <div class="cr-heading">Elyra Labs</div>
            <div class="cr-caption">Community & Development</div>
          </div>
        </div>

        <div class="cr-list">
          <div class="cr-item">
            Lynx Decode
            <span>Founder & Lead Developer</span>
          </div>

          <div class="cr-item">
            Kyy
            <span>Core Development Team</span>
          </div>

          <div class="cr-item">
            Dinda Novelina
            <span>Deputy Developer · Community Team</span>
          </div>
        </div>
      </div>

      <div class="cr-section cr-corporate">
        <div class="cr-section-head">
          <div class="cr-icon">🏢</div>
          <div>
            <div class="cr-heading">INF Projects Corporation</div>
            <div class="cr-caption">Corporate & Project Ecosystem</div>
          </div>
        </div>

        <div class="cr-list">
          <div class="cr-item">
            INF Projects Team
            <span>Corporate Community & Project Support</span>
          </div>

          <div class="cr-item">
            Team Lynx Decode
            <span>Development & Technical Collaboration</span>
          </div>
        </div>
      </div>

      <div class="cr-section cr-foundation">
        <div class="cr-section-head">
          <div class="cr-icon">⚙️</div>
          <div>
            <div class="cr-heading">Original Base & Foundation</div>
            <div class="cr-caption">Project Foundation</div>
          </div>
        </div>

        <div class="cr-list">
          <div class="cr-item">
            BangsulBotz
            <span>Zapo-JS Base</span>
          </div>
        </div>
      </div>

      <div class="cr-section cr-contributor">
        <div class="cr-section-head">
          <div class="cr-icon">🧩</div>
          <div>
            <div class="cr-heading">Feature Contributors</div>
            <div class="cr-caption">Feature Development & Improvements</div>
          </div>
        </div>

        <div class="cr-list">
          <div class="cr-item">
            Dinda Novelina
            <span>Feature Contributions</span>
          </div>
        </div>
      </div>

      <div class="cr-section cr-quality">
        <div class="cr-section-head">
          <div class="cr-icon">🛡️</div>
          <div>
            <div class="cr-heading">Testing & Quality Assurance</div>
            <div class="cr-caption">Bug Reports · Testing · Error Finding</div>
          </div>
        </div>

        <div class="cr-list">
          <div class="cr-item">
            Dinda
            <span>Testing & Bug Reports</span>
          </div>

          <div class="cr-item">
            All User Script
            <span>Community Testing & Feedback</span>
          </div>
        </div>
      </div>

      <div class="cr-section cr-infrastructure">
        <div class="cr-section-head">
          <div class="cr-icon">🌐</div>
          <div>
            <div class="cr-heading">Hosting & Infrastructure</div>
            <div class="cr-caption">Infrastructure Support</div>
          </div>
        </div>

        <div class="cr-list">
          <div class="cr-item">NAUVAL</div>
          <div class="cr-item">YUPRA</div>
          <div class="cr-item">
            PT Kantin Digital
            <span>KANDIG</span>
          </div>
          <div class="cr-item">BI HOST</div>
        </div>
      </div>

      <div class="cr-section cr-thanks">
        <div class="cr-section-head">
          <div class="cr-icon">🤍</div>
          <div>
            <div class="cr-heading">Special Thanks & Support</div>
            <div class="cr-caption">Everyone Behind the Journey</div>
          </div>
        </div>

        <div class="cr-list">
          <div class="cr-item">Team INF Projects</div>
          <div class="cr-item">Team Lynx Decode</div>
          <div class="cr-item">All Elyra Contributors</div>
          <div class="cr-item">The Entire Elyra Community</div>
        </div>
      </div>

    </div>

    <div class="cr-footer">
      <div class="cr-footer-title">A Note of Appreciation</div>

      <div class="cr-footer-text">
        Every contribution helps Elyra grow.
        Thank you to every developer, contributor, tester,
        and community member who has supported this journey.
        <br><br>
        <strong>Support the project and keep the development going.</strong>
      </div>

      <div class="cr-divider"></div>

      <div class="cr-copyright">
        ELYRA LABS · © ELYRA-AI
      </div>
    </div>

  </div>
</div>
`

export default {
  command: 'credits',
  alias: ['credit', 'tqto'],
  category: 'bot',
  description: 'Menampilkan credits, komunitas, dan ucapan terima kasih Elyra.',
  help: '',
  typing: true,

  async execute(m, { sock }) {
    await sock.sendReact(
      m.chat,
      '⏳',
      m.key || m.id
    ).catch(() => {})

    try {
      await sendRichJH(sock, m.chat, HTML)

      await sock.sendReact(
        m.chat,
        '✅',
        m.key || m.id
      ).catch(() => {})
    } catch (err) {
      console.error(
        '[ELYRA-CREDITS]',
        err?.stack || err?.message || err
      )

      await sock.sendReact(
        m.chat,
        '❌',
        m.key || m.id
      ).catch(() => {})

      return m.reply('🍂 Gagal menampilkan credits Elyra.')
    }
  }
}